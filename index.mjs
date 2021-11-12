import fetch from "node-fetch";
import secret from "./index.js";
import { MongoClient } from "mongodb";

var client = new Promise((resolve, reject) => {
    MongoClient.connect(`mongodb+srv://${secret.DB_USER}:${secret.DB_PASS}@cluster0.verow.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`, {
        useNewUrlParser: true,
        useUnifiedTopology: true
    }, (err, client) => {
        if(err) reject(err);

        resolve(client);
    });
});

async function getQuestions(cursor, quantity) {
    return await fetch(`https://www.khanacademy.org/api/internal/questions?topic=computer-programming&limit=${quantity || 10}${cursor ? "&cursor=" + cursor : ""}`).then(response => response.json()).catch(err => console.error(err));
}

async function getComments(key) {
    return await fetch(`https://www.khanacademy.org/api/internal/discussions/${key}/replies`).then(response => response.json()).catch(err => console.error(err));
}

client.then(async db => {
    let cursor = "";
    let quantity = 10;
    while(true) {
        let index = await getQuestions(cursor,  quantity);

        cursor = index.cursor;

        let questions = index.feedback;

        for(let i = 0; i < questions.length; i++) {
            let index = questions[i];
            
            let score = index.sumVotesIncremented / (index.flags.length + 1);

            if(!Math.round(score)) continue;

            let construct = {
                authorKAID: index.authorKaid,
                authorNickname: index.authorNickname,
                dateAsked: index.date,
                lastActivity: index.lastAnswerDate,
                votes: index.sumVotesIncremented,
                content: index.content,
                comments: (index.replyCount ? (await getComments(index.key)).map(index => ({
                    authorKAID: index.authorKaid,
                    authorNickname: index.authorNickname,
                    date: index.date,
                    content: index.content
                })) : []),
                answers: (index.answers.length ? await Promise.all(index.answers.map(async index => ({
                    authorKAID: index.authorKaid,
                    authorNickname: index.authorNickname,
                    date: index.date,
                    votes: index.sumVotesIncremented,
                    content: index.content,
                    comments: (index.replyCount ? (await getComments(index.key)).map(index => ({
                        authorKAID: index.authorKaid,
                        authorNickname: index.authorNickname,
                        date: index.date,
                        content: index.content
                    })) : [])
                }))) : [])
            };

            console.log(construct);
        }
    }
}).catch(err => console.error(err));