const log = console.log.bind(console)
const http = require('http')
const https = require('https')
const fs = require('fs')
const url = require('url')
const express = require('express')
const bodyParser = require('body-parser')
const { baseURL } = require('./server.config.js')

const app = express()
app.use(bodyParser.json())

const clientByProtocol = protocol =>  protocol === 'http:' ? http : https

const httpOptions = (request) => {
    let server = baseURL
    // 把 server 网址解析成一个 url 对象
    let o = url.parse(server)
    let headers = Object.assign({}, request.headers)
    let options = Object.assign({}, {
        headers: headers,
    }, o)
    
    options.method = request.method
    options.path = request.originalUrl
    return options
}

app.get('/', (request, response) => {
    fs.readFile('index.html', 'utf8', (error, data) => {
        response.set('Content-Type', 'text/html; charset=UTF-8')
        response.send(data)
    })
})

const sendResponseToClient = (httpResponse, expressResponse) => {
    // 有两个响应对象, 一个是 http 响应对象, 另一个是 express 响应对象
    let r = httpResponse
    let response = expressResponse

    response.status(r.statusCode)
    Object.entries(r.headers).forEach(([k, v]) => {
        response.setHeader(k, v)
    })
    // 当接收到数据的时候触发
    r.on('data', (chunk) => {
        response.send(chunk)
    })
    // 数据发送完成时触发
    r.on('end', () => {
        response.end()
    })
    r.on('error', () => {
        log('error to request')
    })
}

const sendRequestToServer = (request, response) => {
    let options = httpOptions(request)
    let client = clientByProtocol(options.protocol)
    let req = client.request(options, (res) => {
        // 把 server 传过来的响应发送给客户端
        sendResponseToClient(res, response)
    })

    req.on('error', (e) => {
        log(`往 server(${request.url}) 发送请求报错`, e)
    })

    // 如果发送的请求方法不是 GET, 说明 request.body 有数据
    // 此时也要把数据发给 server
    if (options.method !== 'GET') {
        // 先解析 request.body 数据, 然后转成 JSON 格式的字符串
        let body = request.body
        let chunk = JSON.stringify(body)
        // 把 body 的数据发送到 server
        req.write(chunk)
    }
    // 完成
    req.end()
}

app.all('/api/*',(request, response) => {
    // 把客户端发过来的请求转发到服务器
    log('*** request url:', request.url, request.path)
    sendRequestToServer(request, response)
})

const run = (port, host) => {
    let server = app.listen(port, host, () => {
        let address = server.address()
        log(`listening ${address.address}, ${address.port}`)
    })
}

if (require.main === module) {
    run(3300, 'localhost')
}
