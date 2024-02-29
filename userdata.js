import crypto from "crypto"
import { connection } from "./index.js"
import ENCRYPTION_SALT from "./pwSalt.js"

export async function signInAPI(req, res) { 
    const name = req.body.id;
    const pw = req.body.pw;
    const email = req.body.email;
    const nickname = req.body.nickname;

    const sql = "SELECT COUNT('name') AS `count`\
    FROM `userdata`\
    WHERE `name` = ?";

    try { 
        const [result] = await connection.query(sql, [name])
        if (result[0].count > 0) {
            res.status(409).send({
                message: "이미 존재하는 아이디 입니다."
            });
        } else { 
            const encryptedPw = crypto.createHash("sha256").update(pw + ENCRYPTION_SALT).digest("hex")
            const sql2 = "INSERT INTO userdata (name, password, email, nickname) \
            VALUES (?, ?, ?, ?)";
            const result2 = await connection.query(sql2, [name, encryptedPw, email, nickname])
            res.status(200).send();
        }
    } catch (err) {
		res.status(500).send(err);
	}
}

export async function loginAPI(req, res) {
    const name = req.body.id;
    const pw = req.body.pw;
    
    const encryptedPw = crypto.createHash("sha256").update(pw + ENCRYPTION_SALT).digest("hex")

    const findUser = "SELECT `name`, `password`\
    FROM `userdata`\
    WHERE `name` = ?\
    AND `password` = ?";

    const getUserInfo = "SELECT `id`, `name`, `email`, `nickname`, `permission`, `registered_date`\
    FROM `userdata`\
    WHERE `name` = ?"

    const insertToken =`INSERT
        INTO user_auths (token, registered_by, expires)
        VALUES (?, ?, FROM_UNIXTIME(?))`


    try {
        const [matchedUser] = await connection.query(findUser, [name, encryptedPw])
        if (matchedUser.length === 0) {
            res.status(403).send({
                message: "잘못된 아이디 혹은 비밀번호 입니다."
            });
        } else { 
            const [gotUserInfo] = await connection.query(getUserInfo, [name])
            const userInfo = gotUserInfo[0]

            let token = name + Math.random(0, 999999).toString() + new Date().getTime().toString()
            token = crypto.createHash("sha256").update(token).digest("hex")

            const expires = Math.floor(new Date().getTime() / 1000) + 60 * 60 * 24 * 7

            await connection.query(insertToken, [token, userInfo.id, expires])

            res.status(200).send({
                userInfo: userInfo,
                message: "로그인이 성공했습니다.",
                token: token
            });
        }
    } catch (err) { 
        res.status(500).send(err);
    }
}

export async function autoLoginAPI(req, res) { 
    res.status(200).send({
        userInfo: res.locals.user,
        message: "로그인이 성공했습니다.",
    });
}

export async function updateUserInfoAPI(req, res) { 
    const name = req.body.name;
    const email = req.body.email;
    const nickname = req.body.nickname;

    const sql = "UPDATE `userdata`\
        SET `email` = ?, `nickname` = ?\
        WHERE `name` = ?"
    
    try {
        await connection.query(sql, [email, nickname, name])
        console.log("success")
        res.status(200).send({
            message: "성공적으로 변경되었습니다."
        })
    } catch (err) { 
        res.status(500).send(err)
    }
}

export async function validateToken(req, res, next) { 
    const token = req.headers["authentification"] || ""
    if (token == "") { 
        return res.status(401).json({
            success: false,
            message: "Auth failed"
        })
    }
    let [checkToken] = await connection.query(`SELECT * 
        FROM user_auths
        WHERE token = ? AND expires > NOW()`,
        token
    )

    if (checkToken.length <= 0) { 
        return res.status(401).json({
            success: false,
            message: "Auth expired or not exists"
        })
    }

    const userId = checkToken[0].registered_by
    let [user] = await connection.query(`SELECT id, name, email, nickname, registered_date
        FROM userdata 
        WHERE id = ?`,
        userId
    )

    if (user.length <= 0) { 
        return res.status(500).json({
            success: false,
            message: "Unexpected server error"
        })
    }

    const userData = user[0]

    res.locals.user = userData
    console.log("validate complete")
    next()
}