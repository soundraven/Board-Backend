import { connection } from "./index.js"
import { substrContent } from "./utils.js"

export async function postListAPI(req, res) {
	let searchText = req.query.keyword
	let searchQuery = ""
	const searchOpt = req.query.searchOpt
	const perPage = req.query.itemsPerPage

	const boardName = req.query.board || ""
	if (boardName == "") {
		res.status(400).send("Board name is empty")
		return
	}

	const currentPage = Number(req.query.page) || "0"
	if (isNaN(currentPage)) {
		res.status(400).send("Page parameter is not valid")
		return
	}

	try {
		//빈칸이면리턴
		if (searchText != "") { 
			searchText = searchText.replace(/([%_])/g, "\\$1")
			//스위치문
			if (searchOpt === '제목') {
				searchQuery = "AND post.title LIKE '%" + searchText + "%'"
			} else if (searchOpt === '제목+내용') {
				searchQuery = "AND (post.title LIKE '%" + searchText + "%' OR post.content LIKE '%" + searchText + "%')"
			} else if (searchOpt === '작성자') { 
				searchQuery = "AND userdata.name LIKE '%" + searchText + "%'"
			}
		}

		const [boardInfoResult] = await connection.query("SELECT \
		`id` \
		FROM `boards` \
		WHERE `board_id`=?", [
			boardName
		]) || []

		if (boardInfoResult.length <= 0) {
			res.status(400).send("Invalid board name")
			return
		}

		const targetBoardID = boardInfoResult[0].id

		const [countResult] = await connection.query("SELECT \
		COUNT(post.id) AS `count` \
		FROM `post` \
		LEFT JOIN userdata ON userdata.id=post.registered_by\
		WHERE `board_id`=? AND `active`=1 " + searchQuery + "", [
			targetBoardID
		])

		const totalPosts = countResult[0].count
		const itemsPerPage = Math.min(perPage, 50)
		const totalPages = Math.ceil(totalPosts / itemsPerPage)


		//여기서 if문으로 한번 조건 걸어서 searchOpt에 따라 결과 다르게 보내게 하면?
		const [itemResults] = await connection.query("SELECT\
			post.*, userdata.name, boards.board_name\
			FROM post\
			LEFT JOIN boards ON boards.id=post.board_id\
			LEFT JOIN userdata ON userdata.id=post.registered_by\
			WHERE post.board_id=? AND `active`=1 " + searchQuery + "\
			ORDER BY post.id DESC\
			LIMIT ?,?", [
			targetBoardID,
			currentPage * itemsPerPage,
			itemsPerPage
		]) || []

		let responseModels = []
		for (let i = 0; i < itemResults.length; ++i) {
			let row = itemResults[i]
			let date = new Date(row.registered_date)

			responseModels.push({
				id: row.id,
				title: row.title,
				board_name: row.board_name,
				content: substrContent(row.content, 50),
				registered_by: row.name,
				registered_date: Math.floor(date.getTime() / 1000),
			})
		}

		res.send({
			datas: responseModels,
			totalPages: totalPages,
			totalCount: totalPosts
		})
	} catch (err) {
		console.log(err)
		if (err.code === 11000) {
			res.status(404).send("게시글이 없습니다.")
		} else {
			res.status(500).send(err)
		}
	}
}

export async function boardPostAPI(req, res) { 
	const boardName = req.body.board_name;
	const title = req.body.title;
	const content = req.body.content;
	const registeredBy = req.body.registered_by;

	const post = "INSERT INTO post (board_id, title, content, registered_by) \
		VALUES (?, ?, ?, ?)";
	try {
		const result = await connection.query(post, [boardName, title, content, registeredBy]);
		res.status(200).send();
	} catch (err) {
		res.status(500).send(err);
	}
}

export async function postUpdateAPI(req, res) {
	const boardName = req.body.board_name;
	const title = req.body.title;
	const content = req.body.content;
	const id = req.body.id

	const update = "UPDATE post SET board_id = ?, title = ?, content = ? WHERE id = ?";
	
	try {
		const result = await connection.query(update, [boardName, title, content, id]);
		res.status(200).send();
	} catch (err) {
		res.status(500).send(err);
	}
}

export async function postDeleteAPI(req, res) { 
	const id = req.body.id 
	const deletePost = "UPDATE post SET active = 0 WHERE id = ?"
	try {
		const result = await connection.query(deletePost, [id]);
		res.status(200).send();
	} catch (err) {
		res.status(500).send(err);
	}
}

//커먼코드 가져오기, 커먼코드 기준으로 데이터 가져와서 v-for
export async function getBoardListAPI(req, res) { 
	const sql = "SELECT \
	`id`, `board_id`, `board_name` FROM `boards` \
	WHERE `common_code` = 'A001' \
	AND `use_status` = 1"

	try {
		const result = await connection.query(sql)
		res.status(200).send(result[0])
	} catch (err) { 
		res.status(500).send(err)
	}
}

export async function getPostDetailAPI(req, res) { 
	//postDetail 가져오면서 이미 내가 좋아요 싫어요 누른 적 있는지 확인도 가능
	const id = req.query.id

	const getPostDetail = `SELECT 
		post.*, userdata.name, boards.board_name,
        SUM(post_likes.liked) AS like_count,
        SUM(post_likes.disliked) AS dislike_count
        FROM post
        LEFT JOIN boards ON boards.id = post.board_id
        LEFT JOIN userdata ON userdata.id = post.registered_by
        LEFT JOIN post_likes ON post_likes.post_id = post.id
        WHERE post.id = ?`

	const getCommentDetail = `SELECT
		comment.*, userdata.name
		FROM comment
		LEFT JOIN userdata ON userdata.id = comment.registered_by
		WHERE comment.post_id = ? AND active = 1`
	
	const countComments = `SELECT
		COUNT(comment.id) AS count
		FROM comment
		LEFT JOIN userdata ON userdata.id = comment.registered_by
		WHERE comment.post_id = ? AND active = 1`
	
	try {
		const [postDetail] = await connection.query(getPostDetail, [id])
		const [commentDetail] = await connection.query(getCommentDetail, [id])
		const [commentsCount] = await connection.query(countComments, [id])
		const totalCommentsCount = commentsCount[0].count

		let responseModels = []
		let postRow = postDetail[0]
		let postDate = new Date(postRow.registered_date)

		responseModels.push({
			id: postRow.id,
			board_id: postRow.board_id,
			title: postRow.title,
			board_name: postRow.board_name,
			content: postRow.content,
			registered_by: postRow.name,
			//작성일자를 타임스탬프 형태로 가공하는 과정
			registered_date: Math.floor(postDate.getTime() / 1000),
			like_count: postRow.like_count,
			dislike_count: postRow.dislike_count,
		})

		let commentModels = []
		for (let i = 0; i < commentDetail.length; ++i) { 
			let commentRow = commentDetail[i]
			let commentDate = new Date(commentRow.registered_date)

			commentModels.push({
				id: commentRow.id,
				post_id: commentRow.post_id,
				content: commentRow.content,
				registered_by: commentRow.name,
				registered_date: Math.floor(commentDate.getTime() / 1000)
			})
		}

		res.send({
			datas: responseModels[0],
			commentsDatas: commentModels,
			totalCommentsCount,
		})
	} catch (err) {
		if (err.code === 11000) {
			res.status(404).send("게시글이 없습니다.")
		} else {
			res.status(500).send(err)
		}
	}
	
}

export async function getMyPostAPI(req, res) { 
	const name = res.locals.user.name
	if (name == "") { 
		res.status(400).send("User name is empty")
		return
	}

	const currentPage = Number(req.query.page) || "0"
	if (isNaN(currentPage)) { 
		res.status(400).send("Page parameter is not valid")
		return
	}

	const countAllPost = `SELECT
		COUNT(*) AS post_count
		FROM post
		LEFT JOIN userdata ON userdata.id = post.registered_by
		WHERE userdata.name = ?`
	
	const getMyPostList = `SELECT
		post.*, userdata.name, boards.board_name
		FROM post
		LEFT JOIN boards ON boards.id = post.board_id 
		LEFT JOIN userdata ON userdata.id = post.registered_by
		WHERE userdata.name = ?
		ORDER BY post.id DESC
		LIMIT ?,?`;

	try {
		const [countedPost] = await connection.query(countAllPost, [name])
		const totalCount = countedPost[0].post_count
		const itemsPerPage = Math.min(20, 50)
		const totalPages = Math.ceil(totalCount / itemsPerPage)

		const [itemsResult] = await connection.query(getMyPostList, [
			name,
			currentPage * itemsPerPage,
			itemsPerPage
		])

		let responseModels = []
		for (let i = 0; i < itemsResult.length; ++i) {
			let row = itemsResult[i]
			let date = new Date(row.registered_date)

			responseModels.push({
				id: row.id,
				title: row.title,
				board_name: row.board_name,
				content: substrContent(row.content, 50),
				registered_by: row.name,
				registered_date: Math.floor(date.getTime() / 1000)
			})
		}

		res.status(200).send({
			message: "성공..",
			datas: responseModels,
			totalPages: totalPages,
			totalCount: totalCount
        })
	} catch (err) {
		if (err.code === 11000) {
			res.status(404).send("게시글이 없습니다.")
		} else {
			res.status(500).send(err)
		}
	}
}

// export async function submitCmtAPI(req, res) { 
// 	const postId = req.body.postId
// 	const content = req.body.cmt
// 	const registeredBy = req.body.registeredBy

// 	const insertCmt = `INSERT INTO comment ( post_id, content, registered_by)
// 		VALUES (?, ?, ?)`

// 	try {
// 		const result = await connection.query(insertCmt, [postId, content, registeredBy])
// 		res.status(200).send()
// 	} catch (err) { 
// 		res.status(500).send(err)
// 	}
// }

// export async function deleteCmtAPI(req, res) { 
// 	const id = req.body.cmtId
// 	const deleteCmt = "UPDATE comment SET active = 0 WHERE id = ?"

// 	try {
// 		const result = await connection.query(deleteCmt, [id])
// 		res.status(200).send()
// 	} catch (err) { 
// 		res.status(500).send(err)
// 	}
// }

// export async function updateCmtAPI(req, res) { 
// 	const id = req.body.cmtId
// 	const updateCmt = "UPDATE comment SET content = ? WHERE id = ?"

// 	try {
// 		const result = await connection.query(updateCmt, [content])
// 		res.status(200).send()
// 	} catch (err) { 
// 		res.status(500).send(err)
// 	}
// }

