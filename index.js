import fs from "fs"
import express from "express"
import bodyParser from "body-parser"
import cors from "cors"
import mysql from "mysql2/promise"
import dotenv from "dotenv"
dotenv.config()

const app = express()
const port = 3000

app.use(cors())
app.use(bodyParser.json())

app.listen(port, () => {
		console.log(`open server ${port}`)
})

export let connection = null

async function startServer() {
	connection = await mysql.createConnection({
		host: process.env.DB_HOST,
		user: process.env.DB_USER,
		password: process.env.DB_PASSWORD,
		database: process.env.DB_DATABASE,
	})

	if (connection != null) {
		console.log("DB Connection success")
	}
}

startServer();

import {
	postListAPI, boardPostAPI, postUpdateAPI,
	postDeleteAPI, getBoardListAPI, getPostDetailAPI,
	getMyPostAPI,
} from "./board.js"
import { submitCmtAPI, deleteCmtAPI, updateCmtAPI,} from "./comment.js"
import { signInAPI, loginAPI, updateUserInfoAPI, autoLoginAPI, validateToken } from "./userdata.js"
import { likedAPI } from "./like.js"

app.get('/boards', postListAPI)
app.post('/post',validateToken, boardPostAPI)
app.post('/postUpdate',validateToken, postUpdateAPI)
app.post('/postDelete',validateToken, postDeleteAPI)

app.get('/detail', getPostDetailAPI)
app.get('/getBoardList', getBoardListAPI)
app.get('/getMyPost', validateToken, getMyPostAPI)

app.post('/signIn', signInAPI)
app.post('/login', loginAPI)
app.get('/autoLogin', validateToken, autoLoginAPI)
app.post('/updateUserInfo', validateToken, updateUserInfoAPI)

app.post('/liked', likedAPI)

app.post('/submitCmt', validateToken, submitCmtAPI)
app.post('/deleteCmt', validateToken, deleteCmtAPI)
app.post('/updateCmt', validateToken, updateCmtAPI)
