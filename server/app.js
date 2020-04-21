const express = require('express')
const log = console.log.bind(console)

const app = express()

app.get('/api/todo', (request, response) => {
    log('/api/todo')
    let l = [
        {
            id: 1,
            text: 'get data success !!!',
        }
    ]
    let s = JSON.stringify(l)
    response.send(s)
})

const run = (port, host) => {
    let server = app.listen(port, host, () => {
        let address = server.address()
        log(`listening ${address.address}, ${address.port}`)
    })
}

if (require.main === module) {
    run(8999, 'localhost')
}
