import { connection } from "./index.js"

export async function likedAPI(req, res) { 
    const postId = req.body.postId
    const userId = req.body.userId
    const liked = req.body.likeDislike

    const likedCheck = `SELECT *
        FROM post_likes
        WHERE post_id = ?
        AND user_id = ?`

    const insertLike = `INSERT INTO post_likes (post_id, liked, user_id)
        VALUES (?, ?, ?)`;
    const insertDislike = `INSERT INTO post_likes (post_id, disliked, user_id)
        VALUES (?, ?, ?)`;
    const updateLike = `UPDATE post_likes
        SET liked = ?, liked_date = NOW()
        WHERE post_id = ? AND user_id = ?`
    const updatedislike = `UPDATE post_likes
        SET disliked = ?, liked_date = NOW()
        WHERE post_id = ? AND user_id = ?`

    try {
        let reaction = null
//좋아요 싫어요 구분하는 값 하나, 올렸는지 내렸는지 구분하는 값 하나
        const [alreadyLiked] = await connection.query(likedCheck, [postId, userId])
        if (alreadyLiked.length > 0) {
            if (liked) {
                const newLiked = alreadyLiked[0].liked === 1 ? 0 : 1
                const result = await connection.query(updateLike, [newLiked, postId, userId])
                if (newLiked === 1) {
                    reaction = 'likeUp'
                } else { 
                    reaction = 'likeDn'
                }
            } else {
                const newDisliked = alreadyLiked[0].disliked === 1 ? 0 : 1
                const result = await connection.query(updatedislike, [newDisliked, postId, userId])
                if (newDisliked === 1) {
                    reaction = 'dislikeUp'
                } else { 
                    reaction = 'dislikeDn'
                }
            }
        } else { 
            if (liked) {
                const liked = 1
                const result = await connection.query(insertLike, [postId, liked, userId])
                reaction = 'likeUp'
                } else {
                const disliked = 1
                const result = await connection.query(insertDislike, [postId, disliked, userId])
                reaction = 'dislikeUp'
                }
        }

        res.status(200).send(reaction)

    } catch (err) {
		res.status(500).send(err);
	}
}
