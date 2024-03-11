import { connection } from "./index.js"
import { substrContent } from "./utils.js"

export async function postListAPI(req, res) {

	const { searchOpt, itemsPerPage: perPage, boardName = "" } = req.query

	if (boardName == "") {
		res.status(400).send("Board name is empty")
		return
	}

	const currentPage = Number(req.query.page) || "0"
	if (isNaN(currentPage)) {
		res.status(400).send("Page parameter is not valid")
		return
	}

	let searchText = req.query.keyword
	let searchQuery = ""
	try {
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

		let targetBoardID = boardInfoResult[0].id
		let params = [targetBoardID]

		if (searchText != "") { 
			searchText = searchText.replace(/([%_])/g, "\\$1")
			switch (searchOpt) { 
				case 'Opt0':
					searchQuery = "AND post.title LIKE ?"
					params.push(searchText)
					break
				case 'Opt1':
					searchQuery = "AND (post.title LIKE ? OR post.content LIKE ?)"
					params.push(searchText, searchText)
					break
				default:
					searchQuery = "AND userdata.name LIKE ?"
					params.push(searchText)
			}
		}

		const [countResult] = await connection.query("SELECT \
			COUNT(post.id) AS `count` \
			FROM `post` \
			LEFT JOIN userdata ON userdata.id=post.registered_by\
			WHERE `board_id`=? AND `active`=1 " + searchQuery + "", params)

		const totalPosts = countResult[0].count
		const itemsPerPage = Math.min(perPage, 50)
		const totalPages = Math.ceil(totalPosts / itemsPerPage)

		const [itemResults] = await connection.query("SELECT\
			post.*, userdata.name, boards.board_name\
			FROM post\
			LEFT JOIN boards ON boards.id=post.board_id\
			LEFT JOIN userdata ON userdata.id=post.registered_by\
			WHERE post.board_id=? AND `active`=1 " + searchQuery + "\
			ORDER BY post.id DESC\
			LIMIT ?,?", [
				...params,
				currentPage * itemsPerPage,
				itemsPerPage,
		]) || []

		const postDatas = itemResults.map(row => { 
			const date = new Date(row.registered_date)
			return {
				id: row.id,
				title: row.title,
				board_name: row.board_name,
				content: substrContent(row.content, 50),
				registered_by: row.name,
				registered_date: Math.floor(date.getTime() / 1000),
			}
		})

		res.send({
			datas: postDatas,
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
	const { boardName, title, content, registeredBy } = req.body

	if (res.locals.user.id !== registeredBy) { 
		res.status(500).send('validate fail');
	}

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
	const { boardName, title, content, id, registeredBy } = req.body

	if (res.locals.user.id !== registeredBy) {
		res.status(500).send('validate fail');
	}

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

		const row = postDetail[0]
		const postDate = new Date(row.registered_date)
		const postData = {
				id: row.id,
				board_id: row.board_id,
				title: row.title,
				board_name: row.board_name,
				content: row.content,
				registered_by: row.registered_by,
				name: row.name,
				registered_date: Math.floor(postDate.getTime() / 1000),
				like_count: row.like_count,
				dislike_count: row.dislike_count,
			}

		const commentsDatas = commentDetail.map(row => { 
			const date = new Date(row.registered_date)
			return {
				id: row.id,
				post_id: row.post_id,
				content: row.content,
				registered_by: row.name,
				registered_date: Math.floor(date.getTime() / 1000)
			}
		})

		res.send({
			datas: postData,
			commentsDatas: commentsDatas,
			totalCommentsCount: totalCommentsCount,
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
		const itemsPerPage = Math.min(30, 50)
		const totalPages = Math.ceil(totalCount / itemsPerPage)

		const [itemsResult] = await connection.query(getMyPostList, [
			name,
			currentPage * itemsPerPage,
			itemsPerPage
		])

		const myPostLists = itemsResult.map(row => { 
			const date = new Date(row.registered_date)
			return {
				id: row.id,
				title: row.title,
				board_name: row.board_name,
				content: substrContent(row.content, 50),
				registered_by: row.name,
				registered_date: Math.floor(date.getTime() / 1000),
				active: row.active,
			}
		})

		res.status(200).send({
			message: "성공..",
			datas: myPostLists,
			totalPages: totalPages,
			totalCount: totalCount,
        })
	} catch (err) {
		if (err.code === 11000) {
			res.status(404).send("게시글이 없습니다.")
		} else {
			res.status(500).send(err)
		}
	}
}