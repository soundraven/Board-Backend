import fs from "fs"
import express from "express"
import bodyParser from "body-parser"
import cors from "cors"
import mysql from "mysql2/promise"
import dbConnection from "./dbConnection.js"

//import등 할때 경로 단축해서 작성할 수 있게 해주는 것 있음.
//"type": "module"를 package.json에 작성해야 import export 가능함
const app = express()
const port = 3000

app.use(cors())
app.use(bodyParser.json())

app.get('/', helloWorldAPI)

app.listen(port, () => {
		console.log(`open server ${port}`)
})

export let connection = null

async function startServer() {
	connection = await mysql.createConnection({
		host: dbConnection.DB_HOST,
		user: dbConnection.DB_USER,
		password: dbConnection.DB_PASSWORD,
		database: dbConnection.DB_DATABASE,
	})

	if (connection != null) {
		console.log("DB Connection success")
	}
}

startServer();

import { helloWorldAPI } from "./hello.js"
import {
	postListAPI, boardPostAPI, postUpdateAPI,
	postDeleteAPI, getBoardListAPI, getPostDetailAPI,
	getMyPostAPI,
} from "./board.js"
import { submitCmtAPI, deleteCmtAPI, updateCmtAPI,} from "./comment.js"
import { signInAPI, loginAPI, updateUserInfoAPI, autoLoginAPI, validateToken } from "./userdata.js"
import { subwayArrivalAPI } from "./station.js"
import { likedAPI } from "./like.js"

app.get('subwayArrival', subwayArrivalAPI)

app.get('/boards', postListAPI)
app.post('/post', boardPostAPI)
app.post('/postUpdate', postUpdateAPI)
app.post('/postDelete', postDeleteAPI)

app.get('/detail', getPostDetailAPI)
app.get('/getBoardList', getBoardListAPI)
app.get('/getMyPost', validateToken, getMyPostAPI)

app.post('/signIn', signInAPI)
app.post('/login', loginAPI)
app.get('/autoLogin', validateToken, autoLoginAPI)
app.post('/updateUserInfo', validateToken, updateUserInfoAPI)

app.post('/liked', likedAPI)

app.post('/submitCmt', submitCmtAPI)
app.post('/deleteCmt', deleteCmtAPI)
app.post('/updateCmt', updateCmtAPI)
