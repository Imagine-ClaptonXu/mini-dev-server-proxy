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
    // 把 server 网址解析成一个 url 对象, 方便发请求的时候使用
    let o = url.parse(server)
    // 把浏览器发送的请求的 headers 全部添加到 options 中
    let headers = Object.assign({}, request.headers)
    let options = Object.assign({}, {
        headers: headers,
    }, o)
    
    options.method = request.method
    // request.originalUrl 不仅包含 path, 还包含 query string
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

    // 设置响应对象的状态码和头部字段
    response.status(r.statusCode)
    Object.entries(r.headers).forEach(([k, v]) => {
        response.setHeader(k, v)
    })
    // 当接收到数据的时候触发 data 事件, 然后把数据发送给客户端
    r.on('data', (chunk) => {
        response.send(chunk)
    })
    // 数据发送完成时触发 end 事件, express 对象告诉客户端数据发送完毕
    r.on('end', () => {
        response.end()
    })
    // 往客户端发送数据的过程中出错
    r.on('error', () => {
        log('error to request')
    })
}

const sendRequestToServer = (request, response) => {
    // 请求格式如下
    // https://nodejs.org/docs/latest/api/http.html#http_http_request_url_options_callback
    let options = httpOptions(request)
    // 根据协议来选择用 http 模块还是 https 模块发送
    let client = clientByProtocol(options.protocol)
    // 通过 client.request 往 server 发送请求
    // 返回值 req 是 clientRequest 的实例, 可以监听一些事件, 方便处理
    let req = client.request(options, (res) => {
        // 收到 server 传过来的响应后, 把这个响应发送给客户端(也就是浏览器)
        sendResponseToClient(res, response)
    })

    // 监听 error 事件, 也就是往 server 发送请求的过程中发生错误会触发这个事件
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
        // https://nodejs.org/docs/latest/api/http.html#http_request_write_chunk_encoding_callback
        req.write(chunk)
    }
    // 完成发送请求
    req.end()
}

// 会拿到所有浏览器发送的以 /api/ 开头的请求, 不管用什么请求方法都会被拿到
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
