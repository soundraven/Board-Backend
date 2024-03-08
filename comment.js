import { connection } from "./index.js"

export async function submitCmtAPI(req, res) { 
	const { postId, cmt, registeredBy } = req.body

	if (res.locals.user.id !== registeredBy) {
		res.status(500).send('validate fail');
	}

	const insertCmt = `INSERT INTO comment ( post_id, content, registered_by)
		VALUES (?, ?, ?)`

	try {
		const result = await connection.query(insertCmt, [postId, cmt, registeredBy])
		res.status(200).send()
	} catch (err) { 
		res.status(500).send(err)
	}
}

export async function deleteCmtAPI(req, res) {
	const id = req.body.cmtId
	const deleteCmt = "UPDATE comment SET active = 0 WHERE id = ?"
	const registeredBy = req.body.registeredBy

	if (res.locals.user.id !== registeredBy) {
		res.status(500).send('validate fail');
	}

	try {
		const result = await connection.query(deleteCmt, [id])
		res.status(200).send()
	} catch (err) {
		res.status(500).send(err)
	}
}

export async function updateCmtAPI(req, res) {
	const { cmtId, editedCmt, registeredBy } = req.body

	if (res.locals.user.id !== registeredBy) {
		res.status(500).send('validate fail');
	}

	const updateCmt = "UPDATE comment SET content = ? WHERE id = ?"

	try {
		const result = await connection.query(updateCmt, [editedCmt, cmtId])
		res.status(200).send()
	} catch (err) {
		res.status(500).send(err)
	}
}