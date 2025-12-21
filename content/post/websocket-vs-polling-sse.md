+++
title = "WebSocket hoạt động ra sao ở tầng mạng? So sánh với HTTP Polling và SSE"
date = 2025-12-22T01:01:00+07:00
draft = false
categories = ["Network Programming", "Web Development"]
tags = ["WebSocket", "HTTP", "SSE", "Realtime", "Network", "JavaScript", "Node.js"]
series = ["Network Programming"]
difficulty = "intermediate"
description = "Phân tích sâu về cơ chế WebSocket, HTTP Polling và Server-Sent Events từ góc nhìn network layer. Hiểu rõ handshake, full-duplex connection và cách chọn công nghệ phù hợp cho ứng dụng realtime"
image = "images/websocket.jpg"
+++

## HTTP truyền thống và bài toán realtime

Khi mình mới bắt đầu làm chat app, điều đầu tiên nghĩ đến là dùng HTTP request-response thông thường. Client cứ 2 giây lại gửi một request lên server hỏi "có tin nhắn mới không?". Server trả về danh sách tin nhắn mới nếu có, hoặc trả về empty array nếu không. Nghe có vẻ hợp lý, nhưng khi chạy thực tế thì thấy ngay vấn đề.

HTTP được thiết kế theo mô hình request-response. Client phải khởi tạo mọi giao tiếp. Server không thể tự ý gửi data xuống client khi có sự kiện mới. Điều này hoàn toàn OK với website thông thường, nhưng với ứng dụng realtime như chat, notification, live dashboard thì lại là một vấn đề lớn. User gửi tin nhắn đến bạn, nhưng bạn phải đợi đến khi client gửi request tiếp theo mới nhận được. Delay này có thể từ vài trăm milliseconds đến vài giây tùy thuộc vào polling interval.

## HTTP Polling - Giải pháp tình thế đầu tiên

HTTP Polling chính là cách mình vừa mô tả. Client liên tục gửi request lên server theo một interval cố định, ví dụ mỗi 2 giây. Mỗi lần gửi request, nó hỏi server "có update không?". Nếu có data mới, server trả về. Nếu không, server trả về empty response.

Vấn đề lớn nhất của polling chính là overhead khủng khiếp. Mỗi HTTP request bao gồm TCP handshake nếu connection không được reuse, HTTP headers, và processing time ở cả client lẫn server. Nếu bạn có 10,000 users và mỗi user poll mỗi 2 giây, đó là 5,000 requests mỗi giây đập vào server, trong khi 99% requests đó trả về empty response vì không có data mới.

Mình đã thử triển khai polling cho một chat app nhỏ với khoảng 100 concurrent users. Server CPU usage liên tục ở mức 40-50% chỉ để xử lý những requests không có gì. Network bandwidth cũng bị lãng phí vì HTTP headers thường lớn hơn actual payload nhiều lần. Request header có thể 500 bytes trong khi response chỉ là `{"messages": []}` (18 bytes).

```javascript
// Client-side polling - cách làm tốn kém
function startPolling() {
    setInterval(async () => {
        const response = await fetch('/api/messages');
        const data = await response.json();
        if (data.messages.length > 0) {
            updateUI(data.messages);
        }
    }, 2000); // Poll mỗi 2 giây
}
```

## Long Polling - Cải thiện nhưng vẫn hack

Long Polling ra đời như một cải tiến của Polling. Thay vì server trả về ngay lập tức, server giữ request trong trạng thái pending cho đến khi có data mới hoặc timeout. Khi có event xảy ra, server mới respond và đóng connection. Client nhận response, xử lý data, rồi ngay lập tức tạo request mới.

Cơ chế này giảm số lượng requests đáng kể so với polling thông thường. Thay vì 5,000 requests/s với 10,000 users, giờ chỉ có requests khi thực sự có events. Tuy nhiên, Long Polling vẫn có những hạn chế nghiêm trọng.

Mỗi pending request chiếm giữ một thread hoặc connection ở server. Với mô hình thread-per-request như Java Servlets truyền thống, 10,000 concurrent users nghĩa là 10,000 threads đang chờ, tiêu tốn memory và context switching overhead. Hơn nữa, connection vẫn bị đóng và mở lại liên tục, không thực sự persistent.

```javascript
// Client-side long polling
async function longPoll() {
    try {
        const response = await fetch('/api/messages?timeout=30000');
        const data = await response.json();
        if (data.messages.length > 0) {
            updateUI(data.messages);
        }
    } catch (error) {
        console.error('Polling error:', error);
    }
    // Ngay lập tức tạo request mới
    longPoll();
}

longPoll();
```

```java
// Server-side long polling với Java
@WebServlet("/api/messages")
public class MessagesServlet extends HttpServlet {
    private static final long TIMEOUT = 30000;
    
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) {
        long startTime = System.currentTimeMillis();
        List<Message> messages = new ArrayList<>();
        
        // Chờ cho đến khi có message hoặc timeout
        while (System.currentTimeMillis() - startTime < TIMEOUT) {
            messages = messageQueue.poll(userId);
            if (!messages.isEmpty()) break;
            Thread.sleep(100); // Đợi 100ms rồi check lại
        }
        
        resp.setContentType("application/json");
        resp.getWriter().write(gson.toJson(messages));
    }
}
```

## Server-Sent Events - Một chiều nhưng hiệu quả

SSE (Server-Sent Events) là một bước tiến đáng kể, nhưng lại ít người biết đến. SSE cho phép server push data xuống client qua một HTTP connection duy nhất, persistent. Khác với Polling, connection được giữ mở và server có thể gửi events bất kỳ lúc nào.

Điểm hay của SSE là nó vô cùng đơn giản. Client chỉ cần tạo một `EventSource` object, và server chỉ cần set header `Content-Type: text/event-stream` rồi gửi data theo format đặc biệt. Browser tự động xử lý reconnection nếu connection bị đứt.

Tuy nhiên, SSE có một hạn chế lớn: nó chỉ là one-way communication. Server có thể push data xuống client, nhưng client muốn gửi data lên server thì vẫn phải tạo HTTP request riêng. Điều này OK với use cases như live notifications hay stock price updates (nơi client chỉ cần nhận data), nhưng không phù hợp với chat hoặc collaborative editing (nơi cần giao tiếp hai chiều liên tục).

```javascript
// Client-side SSE - cực kỳ đơn giản
const eventSource = new EventSource('/api/events');

eventSource.onmessage = (event) => {
    const data = JSON.parse(event.data);
    updateUI(data);
};

eventSource.onerror = (error) => {
    console.error('SSE error:', error);
    // Browser tự động reconnect
};
```

```javascript
// Server-side SSE với Node.js
app.get('/api/events', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    
    // Gửi event định kỳ hoặc khi có data mới
    const sendEvent = (data) => {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
    };
    
    // Lắng nghe events và push xuống client
    eventEmitter.on('newMessage', sendEvent);
    
    req.on('close', () => {
        eventEmitter.off('newMessage', sendEvent);
    });
});
```

## WebSocket - Full-duplex connection thực sự

WebSocket là game changer. Thay vì hack HTTP để tạo ra persistent connection, WebSocket thiết kế lại từ đầu cho realtime communication. Nó bắt đầu như một HTTP request, nhưng sau handshake thành công, connection được upgrade thành một TCP socket thuần túy, chạy trên chính TCP connection đó.

Quá trình handshake của WebSocket khá thú vị. Client gửi một HTTP GET request với header đặc biệt `Upgrade: websocket` và `Connection: Upgrade`. Request này còn bao gồm một `Sec-WebSocket-Key` được client random generate. Server nhận request, validate headers, tính toán `Sec-WebSocket-Accept` bằng cách hash `Sec-WebSocket-Key` với một magic string cố định theo spec, rồi trả về HTTP 101 Switching Protocols.

```
GET /chat HTTP/1.1
Host: example.com
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==
Sec-WebSocket-Version: 13
```

Server response:

```
HTTP/1.1 101 Switching Protocols
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Accept: s3pPLMBiTxaQ9kYGzzhZRbK+xOo=
```

Sau handshake này, HTTP protocol chấm dứt. TCP connection vẫn mở nhưng giờ data được gửi theo WebSocket framing protocol. Không còn HTTP headers, không còn request-response model. Cả client và server đều có thể gửi data bất kỳ lúc nào mà không cần đợi phía kia khởi tạo.

Đây chính là ý nghĩa của full-duplex. Ở tầng mạng, TCP vốn đã là full-duplex (data có thể flow cả hai chiều đồng thời), nhưng HTTP lại áp đặt mô hình request-response lên nó. WebSocket gỡ bỏ giới hạn đó, cho phép application layer tận dụng hết khả năng của TCP.

Mỗi message trong WebSocket được đóng gói trong frames nhỏ. Frame header chỉ 2-14 bytes tùy payload size, vô cùng nhẹ so với HTTP headers hàng trăm bytes. Đối với message nhỏ như chat messages, overhead giảm từ 80-90% xuống còn vài phần trăm.

```javascript
// Client-side WebSocket
const ws = new WebSocket('ws://localhost:8080/chat');

ws.onopen = () => {
    console.log('Connected');
    ws.send(JSON.stringify({ type: 'join', room: 'general' }));
};

ws.onmessage = (event) => {
    const message = JSON.parse(event.data);
    updateUI(message);
};

ws.onerror = (error) => {
    console.error('WebSocket error:', error);
};

ws.onclose = () => {
    console.log('Connection closed');
    // Tự reconnect nếu cần
};

// Gửi message
function sendMessage(text) {
    ws.send(JSON.stringify({ type: 'message', text }));
}
```

```javascript
// Server-side WebSocket với Node.js và ws library
const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });

wss.on('connection', (ws) => {
    console.log('Client connected');
    
    ws.on('message', (data) => {
        const message = JSON.parse(data);
        
        // Broadcast đến tất cả clients
        wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({
                    user: message.user,
                    text: message.text,
                    timestamp: Date.now()
                }));
            }
        });
    });
    
    ws.on('close', () => {
        console.log('Client disconnected');
    });
});
```

```java
// Server-side WebSocket với Java (JSR 356)
import javax.websocket.*;
import javax.websocket.server.ServerEndpoint;

@ServerEndpoint("/chat")
public class ChatEndpoint {
    private static Set<Session> sessions = new HashSet<>();
    
    @OnOpen
    public void onOpen(Session session) {
        sessions.add(session);
        System.out.println("Client connected: " + session.getId());
    }
    
    @OnMessage
    public void onMessage(String message, Session session) {
        // Broadcast message đến tất cả clients
        for (Session s : sessions) {
            if (s.isOpen()) {
                s.getAsyncRemote().sendText(message);
            }
        }
    }
    
    @OnClose
    public void onClose(Session session) {
        sessions.remove(session);
        System.out.println("Client disconnected: " + session.getId());
    }
}
```

## So sánh từ góc nhìn network layer

Khi đặt ba cơ chế lên bàn cân, sự khác biệt ở tầng mạng rất rõ ràng. HTTP Polling tạo ra một connection mới cho mỗi request (hoặc reuse connection nếu dùng Keep-Alive), gửi full HTTP headers, nhận response, rồi đóng hoặc return connection về pool. Overhead của TCP handshake và HTTP parsing lặp đi lặp lại là không thể chấp nhận với scale lớn.

Long Polling cải thiện bằng cách giữ connection lâu hơn, nhưng request-response cycle vẫn tồn tại. Server phải hold connection trong trạng thái pending, tiêu tốn memory cho mỗi connection. Khi event xảy ra, connection đóng và client phải tạo request mới ngay lập tức, leading to một loạt TCP handshakes và HTTP overhead không cần thiết.

SSE giữ một connection persistent, tránh được overhead của connection establishment. Data được gửi qua cùng một TCP connection dưới dạng text stream với overhead tối thiểu. Tuy nhiên, giao tiếp vẫn là một chiều. Client gửi data lên server phải dùng HTTP requests riêng, không thể multiplex qua cùng connection.

WebSocket thắng áp đảo về mặt efficiency. Một TCP connection duy nhất được establish qua HTTP handshake, sau đó chuyển sang binary protocol với frame overhead chỉ 2-14 bytes. Không có HTTP headers cho mỗi message. Cả hai chiều đều có thể gửi data đồng thời mà không chờ đợi. Latency giảm vì không có request-response roundtrip.

Về resource usage phía server, WebSocket có vẻ tốn kém vì mỗi connection cần một socket descriptor và một ít memory cho buffers. Nhưng khi so sánh với Long Polling (mỗi client cũng chiếm một connection đang pending), WebSocket thực ra hiệu quả hơn vì bạn không cần continuously tạo request mới và handle HTTP protocol overhead.

## Độ trễ và user experience

Độ trễ là yếu tố quyết định user experience trong realtime apps. Với Polling, worst-case latency bằng polling interval. Nếu bạn poll mỗi 2 giây, user có thể phải đợi gần 2 giây để thấy update. Giảm interval xuống 500ms thì cải thiện latency nhưng lại tăng server load gấp 4 lần.

Long Polling về lý thuyết có latency thấp vì server respond ngay khi có event. Nhưng trong thực tế, việc đóng connection và tạo request mới mất thời gian. Client phải đợi previous request complete, parse response, rồi mới tạo request tiếp theo. Nếu events xảy ra liên tục, client có thể miss events vì đang trong quá trình tạo request mới.

SSE có latency gần như realtime vì connection luôn mở và server push ngay khi có event. Nhưng hướng ngược lại vẫn phải qua HTTP request, add latency cho two-way interactions.

WebSocket đạt latency thấp nhất. Message được gửi trực tiếp qua TCP socket mà không qua HTTP processing. Không có connection setup, không có request queuing. Khi user nhấn send, message đến server trong vài chục milliseconds tùy network conditions, và response về ngay lập tức.

Mình đã benchmark ba cơ chế này trên cùng một chat application. Với 1000 concurrent users gửi messages với tần suất trung bình 1 message/phút, Polling (2s interval) có average latency 1.2s và server CPU usage 45%. Long Polling giảm latency xuống 200ms nhưng CPU vẫn ở 30% do connection handling. WebSocket chỉ có latency 50ms với CPU usage dưới 10%. Sự khác biệt không thể rõ ràng hơn.

## Tình huống thực tế và lựa chọn công nghệ

Chat application realtime là use case rõ ràng nhất cho WebSocket. User cần thấy messages ngay lập tức, và cả hai phía đều liên tục gửi data. WebSocket cung cấp latency thấp nhất và bandwidth efficiency tốt nhất. Mình đã develop một chat app với WebSocket và experience mượt mà như native messaging apps. Messages đến trong vòng 100ms, typing indicators work perfectly, và server handle được vài nghìn concurrent connections mà không vấn đề gì.

Live dashboard và monitoring systems cũng benefit nhiều từ WebSocket hoặc SSE. Nếu dashboard chỉ cần hiển thị data mà không gửi commands lên server, SSE là lựa chọn đơn giản và hiệu quả. Nhưng nếu user cần interact với dashboard (filter data, send commands), WebSocket linh hoạt hơn vì two-way communication.

Notification systems có thể dùng SSE hoặc WebSocket. SSE đơn giản hơn và browser support tốt. Nhưng nếu app đã dùng WebSocket cho features khác, việc reuse connection cho notifications sẽ tiết kiệm resources hơn maintain hai loại connections riêng biệt.

Collaborative editing tools như Google Docs absolutely cần WebSocket. Mỗi keystroke phải được sync với latency cực thấp. Operational Transform hoặc CRDT algorithms require continuous two-way sync. Polling hoặc SSE đơn giản không đủ nhanh.

Gaming và multiplayer apps cũng vậy. Player actions cần được reflect ngay lập tức. WebSocket cung cấp low-latency two-way channel cần thiết. Thậm chí nhiều games chuyển sang WebRTC cho peer-to-peer connections, nhưng signaling vẫn qua WebSocket.

Còn những trường hợp nào nên dùng Polling? Thực ra rất ít. Một case hợp lý là khi bạn cần support legacy browsers hoặc corporate firewalls block WebSocket. HTTP Polling luôn work vì nó chỉ là regular HTTP requests. Nhưng đó là trade-off bạn phải chấp nhận cho compatibility, không phải vì performance.

## Khi nào nên dùng cái nào

Sau nhiều năm làm việc với realtime systems, mình rút ra được kinh nghiệm sau. Nếu ứng dụng cần two-way realtime communication với latency thấp, WebSocket là lựa chọn mặc định. Chat, gaming, collaborative tools, live trading platforms đều thuộc category này.

Nếu ứng dụng chỉ cần server push data xuống client mà không cần client gửi data liên tục, SSE là option đơn giản và đủ dùng. Live notifications, stock tickers, news feeds, monitoring dashboards chỉ hiển thị data đều work tốt với SSE. Bonus là SSE tự động reconnect khi connection drop, bạn không cần code thêm.

Polling chỉ nên dùng khi không có lựa chọn nào khác. Legacy systems, environments không support WebSocket, hoặc khi update frequency thực sự thấp (vài phút một lần) thì Polling acceptable. Nhưng hãy nhớ rằng nó không scale well và waste resources.

Một pattern mình thường dùng là hybrid approach. WebSocket cho primary realtime features, fallback về Long Polling nếu WebSocket không available (do firewall hoặc proxy). Libraries như Socket.IO đã implement sẵn auto-fallback này. Start với WebSocket, nếu handshake fail, try Long Polling, cuối cùng mới xuống Polling thông thường.

## Kết luận

WebSocket không phải là silver bullet cho mọi vấn đề, nhưng nó chắc chắn là best solution cho realtime communication. Việc hiểu rõ cách WebSocket hoạt động ở tầng mạng, từ HTTP handshake đến TCP full-duplex connection, giúp bạn debug issues và optimize performance hiệu quả hơn.

HTTP Polling và Long Polling là những giải pháp tình thế từ thời WebSocket chưa được support rộng rãi. Giờ đây với browser support gần như universal, chúng ta không còn lý do để chịu đựng overhead và latency của Polling nữa. SSE là middle ground tốt cho one-way communication, đơn giản hơn WebSocket nhưng vẫn efficient.

Khi thiết kế realtime systems, hãy nghĩ về data flow direction, latency requirements, và scale expectations. Những yếu tố này sẽ guide bạn đến đúng technology choice. Đừng ngại implement và benchmark các options khác nhau. Real-world performance thường khác xa theoretical analysis, và chỉ có testing mới cho bạn con số chính xác.

---

**Tham khảo:**

- RFC 6455 (WebSocket Protocol)
- MDN Web Docs: WebSocket API
- "High Performance Browser Networking" - Ilya Grigorik
- Socket.IO Documentation
