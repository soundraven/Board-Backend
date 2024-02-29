import { connection } from "./index.js"

export async function submitCmtAPI(req, res) { 
	const postId = req.body.postId
	const content = req.body.cmt
	const registeredBy = req.body.registeredBy

	const insertCmt = `INSERT INTO comment ( post_id, content, registered_by)
		VALUES (?, ?, ?)`

	try {
		const result = await connection.query(insertCmt, [postId, content, registeredBy])
		res.status(200).send()
	} catch (err) { 
		res.status(500).send(err)
	}
}

export async function deleteCmtAPI(req, res) { 
	const id = req.body.cmtId
	const deleteCmt = "UPDATE comment SET active = 0 WHERE id = ?"

	try {
		const result = await connection.query(deleteCmt, [id])
		res.status(200).send()
	} catch (err) { 
		res.status(500).send(err)
	}
}

export async function updateCmtAPI(req, res) { 
    const id = req.body.cmtId
    const cmt = req.body.editedCmt

	const updateCmt = "UPDATE comment SET content = ? WHERE id = ?"

	try {
		const result = await connection.query(updateCmt, [cmt, id])
		res.status(200).send()
	} catch (err) { 
		res.status(500).send(err)
	}
}