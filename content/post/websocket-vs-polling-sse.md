+++
title = "WebSocket hoạt động ra sao ở tầng mạng? So sánh với HTTP Polling và SSE"
date = 2025-12-22T01:01:00+07:00
draft = false
categories = ["Network Programming", "Web Development"]
tags = ["WebSocket", "HTTP", "SSE", "Realtime", "Network", "JavaScript", "Node.js"]
series = ["Network Programming"]
difficulty = "intermediate"
description = "Phân tích sâu về cơ chế WebSocket, HTTP Polling và Server-Sent Events từ góc nhìn tầng mạng. Hiểu rõ quá trình bắt tay, kết nối song công toàn phần và cách chọn công nghệ phù hợp cho ứng dụng thời gian thực"
image = "images/websocket.jpg"
+++

## HTTP truyền thống và bài toán thời gian thực

Khi mới bắt đầu làm ứng dụng chat, điều đầu tiên nghĩ đến là dùng HTTP yêu cầu-phản hồi thông thường. Client cứ 2 giây lại gửi một yêu cầu lên server hỏi "có tin nhắn mới không?". Server trả về danh sách tin nhắn mới nếu có, hoặc trả về mảng rỗng nếu không. Nghe có vẻ hợp lý, nhưng khi chạy thực tế thì thấy ngay vấn đề.

HTTP được thiết kế theo mô hình yêu cầu-phản hồi. Client phải khởi tạo mọi giao tiếp. Server không thể tự ý gửi dữ liệu xuống client khi có sự kiện mới. Điều này hoàn toàn ổn với website thông thường, nhưng với ứng dụng thời gian thực như chat, thông báo, bảng điều khiển trực tiếp thì lại là một vấn đề lớn. Người dùng gửi tin nhắn đến, nhưng phải đợi đến khi client gửi yêu cầu tiếp theo mới nhận được. Độ trễ này có thể từ vài trăm mili giây đến vài giây tùy thuộc vào khoảng thời gian thăm dò.

## HTTP Polling - Giải pháp tình thế đầu tiên

HTTP Polling chính là cách vừa mô tả. Client liên tục gửi yêu cầu lên server theo một khoảng thời gian cố định, ví dụ mỗi 2 giây. Mỗi lần gửi yêu cầu, nó hỏi server "có cập nhật không?". Nếu có dữ liệu mới, server trả về. Nếu không, server trả về phản hồi rỗng.

Vấn đề lớn nhất của thăm dò chính là chi phí phụ khủng khiếp. Mỗi yêu cầu HTTP bao gồm bắt tay TCP nếu kết nối không được tái sử dụng, các HTTP headers, và thời gian xử lý ở cả client lẫn server. Nếu có 10,000 người dùng và mỗi người thăm dò mỗi 2 giây, đó là 5,000 yêu cầu mỗi giây đập vào server, trong khi 99% yêu cầu đó trả về phản hồi rỗng vì không có dữ liệu mới.

Trường hợp thử nghiệm thăm dò cho một ứng dụng chat nhỏ với khoảng 100 người dùng đồng thời. Server CPU liên tục ở mức 40-50% chỉ để xử lý những yêu cầu không có gì. Băng thông mạng cũng bị lãng phí vì HTTP headers thường lớn hơn dữ liệu thực nhiều lần. Phần đầu yêu cầu có thể 500 bytes trong khi phản hồi chỉ là `{"messages": []}` (18 bytes).

```javascript
// Client-side polling - cách làm tốn kém
function startPolling() {
  setInterval(async () => {
    const response = await fetch("/api/messages");
    const data = await response.json();
    if (data.messages.length > 0) {
      updateUI(data.messages);
    }
  }, 2000); // Thăm dò mỗi 2 giây
}
```

## Long Polling - Cải thiện nhưng vẫn tạm bợ

Long Polling ra đời như một cải tiến của Polling. Thay vì server trả về ngay lập tức, server giữ yêu cầu trong trạng thái chờ cho đến khi có dữ liệu mới hoặc hết thời gian chờ. Khi có sự kiện xảy ra, server mới phản hồi và đóng kết nối. Client nhận phản hồi, xử lý dữ liệu, rồi ngay lập tức tạo yêu cầu mới.

Cơ chế này giảm số lượng yêu cầu đáng kể so với thăm dò thông thường. Thay vì 5,000 yêu cầu/giây với 10,000 người dùng, giờ chỉ có yêu cầu khi thực sự có sự kiện. Tuy nhiên, Long Polling vẫn có những hạn chế nghiêm trọng.

Mỗi yêu cầu đang chờ chiếm giữ một thread hoặc kết nối ở server. Với mô hình một thread cho một yêu cầu như Java Servlets truyền thống, 10,000 người dùng đồng thời nghĩa là 10,000 threads đang chờ, tiêu tốn bộ nhớ và chi phí chuyển ngữ cảnh. Hơn nữa, kết nối vẫn bị đóng và mở lại liên tục, không thực sự bền vững.

```javascript
// Client-side long polling
async function longPoll() {
  try {
    const response = await fetch("/api/messages?timeout=30000");
    const data = await response.json();
    if (data.messages.length > 0) {
      updateUI(data.messages);
    }
  } catch (error) {
    console.error("Lỗi thăm dò:", error);
  }
  // Ngay lập tức tạo yêu cầu mới
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

        // Chờ cho đến khi có tin nhắn hoặc hết thời gian
        while (System.currentTimeMillis() - startTime < TIMEOUT) {
            messages = messageQueue.poll(userId);
            if (!messages.isEmpty()) break;
            Thread.sleep(100); // Đợi 100ms rồi kiểm tra lại
        }

        resp.setContentType("application/json");
        resp.getWriter().write(gson.toJson(messages));
    }
}
```

## Server-Sent Events - Một chiều nhưng hiệu quả

SSE (Server-Sent Events) là một bước tiến đáng kể, nhưng lại ít người biết đến. SSE cho phép server đẩy dữ liệu xuống client qua một kết nối HTTP duy nhất, bền vững. Khác với thăm dò, kết nối được giữ mở và server có thể gửi sự kiện bất kỳ lúc nào.

Điểm hay của SSE là nó vô cùng đơn giản. Client chỉ cần tạo một đối tượng `EventSource`, và server chỉ cần đặt header `Content-Type: text/event-stream` rồi gửi dữ liệu theo định dạng đặc biệt. Trình duyệt tự động xử lý kết nối lại nếu kết nối bị đứt.

Tuy nhiên, SSE có một hạn chế lớn: nó chỉ là giao tiếp một chiều. Server có thể đẩy dữ liệu xuống client, nhưng client muốn gửi dữ liệu lên server thì vẫn phải tạo yêu cầu HTTP riêng. Điều này ổn với các trường hợp như thông báo trực tiếp hay cập nhật giá cổ phiếu (nơi client chỉ cần nhận dữ liệu), nhưng không phù hợp với chat hoặc chỉnh sửa cộng tác (nơi cần giao tiếp hai chiều liên tục).

```javascript
// Client-side SSE - cực kỳ đơn giản
const eventSource = new EventSource("/api/events");

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  updateUI(data);
};

eventSource.onerror = (error) => {
  console.error("Lỗi SSE:", error);
  // Trình duyệt tự động kết nối lại
};
```

```javascript
// Server-side SSE với Node.js
app.get("/api/events", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  // Gửi sự kiện định kỳ hoặc khi có dữ liệu mới
  const sendEvent = (data) => {
    res.write(`data: ${JSON.stringify(data)}\\n\\n`);
  };

  // Lắng nghe sự kiện và đẩy xuống client
  eventEmitter.on("newMessage", sendEvent);

  req.on("close", () => {
    eventEmitter.off("newMessage", sendEvent);
  });
});
```

## WebSocket - Kết nối song công toàn phần thực sự

WebSocket là bước ngoặt. Thay vì lợi dụng HTTP để tạo ra kết nối bền vững, WebSocket thiết kế lại từ đầu cho giao tiếp thời gian thực. Nó bắt đầu như một yêu cầu HTTP, nhưng sau quá trình bắt tay thành công, kết nối được nâng cấp thành một socket TCP thuần túy, chạy trên chính kết nối TCP đó.

Quá trình bắt tay của WebSocket khá thú vị. Client gửi một yêu cầu HTTP GET với header đặc biệt `Upgrade: websocket` và `Connection: Upgrade`. Yêu cầu này còn bao gồm một `Sec-WebSocket-Key` được client tạo ngẫu nhiên. Server nhận yêu cầu, xác thực headers, tính toán `Sec-WebSocket-Accept` bằng cách băm `Sec-WebSocket-Key` với một chuỗi ma thuật cố định theo đặc tả, rồi trả về HTTP 101 Switching Protocols.

```
GET /chat HTTP/1.1
Host: example.com
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==
Sec-WebSocket-Version: 13
```

Phản hồi của server:

```
HTTP/1.1 101 Switching Protocols
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Accept: s3pPLMBiTxaQ9kYGzzhZRbK+xOo=
```

Sau quá trình bắt tay này, giao thức HTTP chấm dứt. Kết nối TCP vẫn mở nhưng giờ dữ liệu được gửi theo giao thức đóng khung WebSocket. Không còn HTTP headers, không còn mô hình yêu cầu-phản hồi. Cả client và server đều có thể gửi dữ liệu bất kỳ lúc nào mà không cần đợi phía kia khởi tạo.

Đây chính là ý nghĩa của song công toàn phần. Ở tầng mạng, TCP vốn đã là song công toàn phần (dữ liệu có thể chảy cả hai chiều đồng thời), nhưng HTTP lại áp đặt mô hình yêu cầu-phản hồi lên nó. WebSocket gỡ bỏ giới hạn đó, cho phép tầng ứng dụng tận dụng hết khả năng của TCP.

Mỗi tin nhắn trong WebSocket được đóng gói trong các khung nhỏ. Phần đầu khung chỉ 2-14 bytes tùy kích thước dữ liệu tải, vô cùng nhẹ so với HTTP headers hàng trăm bytes. Đối với tin nhắn nhỏ như tin nhắn chat, chi phí phụ giảm từ 80-90% xuống còn vài phần trăm.

```javascript
// Client-side WebSocket
const ws = new WebSocket("ws://localhost:8080/chat");

ws.onopen = () => {
  console.log("Đã kết nối");
  ws.send(JSON.stringify({ type: "join", room: "general" }));
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  updateUI(message);
};

ws.onerror = (error) => {
  console.error("Lỗi WebSocket:", error);
};

ws.onclose = () => {
  console.log("Kết nối đã đóng");
  // Tự kết nối lại nếu cần
};

// Gửi tin nhắn
function sendMessage(text) {
  ws.send(JSON.stringify({ type: "message", text }));
}
```

```javascript
// Server-side WebSocket với Node.js và thư viện ws
const WebSocket = require("ws");
const wss = new WebSocket.Server({ port: 8080 });

wss.on("connection", (ws) => {
  console.log("Client đã kết nối");

  ws.on("message", (data) => {
    const message = JSON.parse(data);

    // Phát tới tất cả clients
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(
          JSON.stringify({
            user: message.user,
            text: message.text,
            timestamp: Date.now(),
          })
        );
      }
    });
  });

  ws.on("close", () => {
    console.log("Client đã ngắt kết nối");
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
        System.out.println("Client đã kết nối: " + session.getId());
    }

    @OnMessage
    public void onMessage(String message, Session session) {
        // Phát tin nhắn đến tất cả clients
        for (Session s : sessions) {
            if (s.isOpen()) {
                s.getAsyncRemote().sendText(message);
            }
        }
    }

    @OnClose
    public void onClose(Session session) {
        sessions.remove(session);
        System.out.println("Client đã ngắt kết nối: " + session.getId());
    }
}
```

## So sánh từ góc nhìn tầng mạng

Khi đặt ba cơ chế lên bàn cân, sự khác biệt ở tầng mạng rất rõ ràng. HTTP Polling tạo ra một kết nối mới cho mỗi yêu cầu (hoặc tái sử dụng kết nối nếu dùng Keep-Alive), gửi toàn bộ HTTP headers, nhận phản hồi, rồi đóng hoặc trả kết nối về nhóm. Chi phí phụ của quá trình bắt tay TCP và phân tích HTTP lặp đi lặp lại là không thể chấp nhận với quy mô lớn.

Long Polling cải thiện bằng cách giữ kết nối lâu hơn, nhưng chu kỳ yêu cầu-phản hồi vẫn tồn tại. Server phải giữ kết nối trong trạng thái chờ, tiêu tốn bộ nhớ cho mỗi kết nối. Khi sự kiện xảy ra, kết nối đóng và client phải tạo yêu cầu mới ngay lập tức, dẫn đến một loạt quá trình bắt tay TCP và chi phí phụ HTTP không cần thiết.

SSE giữ một kết nối bền vững, tránh được chi phí phụ của việc thiết lập kết nối. Dữ liệu được gửi qua cùng một kết nối TCP dưới dạng luồng văn bản với chi phí phụ tối thiểu. Tuy nhiên, giao tiếp vẫn là một chiều. Client gửi dữ liệu lên server phải dùng các yêu cầu HTTP riêng, không thể ghép kênh qua cùng kết nối.

WebSocket thắng áp đảo về mặt hiệu quả. Một kết nối TCP duy nhất được thiết lập qua quá trình bắt tay HTTP, sau đó chuyển sang giao thức nhị phân với chi phí phụ khung chỉ 2-14 bytes. Không có HTTP headers cho mỗi tin nhắn. Cả hai chiều đều có thể gửi dữ liệu đồng thời mà không chờ đợi. Độ trễ giảm vì không có vòng qua yêu cầu-phản hồi.

Về việc sử dụng tài nguyên phía server, WebSocket có vẻ tốn kém vì mỗi kết nối cần một mô tả socket và một ít bộ nhớ cho buffers. Nhưng khi so sánh với Long Polling (mỗi client cũng chiếm một kết nối đang chờ), WebSocket thực ra hiệu quả hơn vì không cần liên tục tạo yêu cầu mới và xử lý chi phí phụ giao thức HTTP.

## Độ trễ và trải nghiệm người dùng

Độ trễ là yếu tố quyết định trải nghiệm người dùng trong các ứng dụng thời gian thực. Với thăm dò, độ trễ tệ nhất bằng khoảng thời gian thăm dò. Nếu thăm dò mỗi 2 giây, người dùng có thể phải đợi gần 2 giây để thấy cập nhật. Giảm khoảng thời gian xuống 500ms thì cải thiện độ trễ nhưng lại tăng tải server gấp 4 lần.

Long Polling về lý thuyết có độ trể thấp vì server phản hồi ngay khi có sự kiện. Nhưng trong thực tế, việc đóng kết nối và tạo yêu cầu mới mất thời gian. Client phải đợi yêu cầu trước hoàn thành, phân tích phản hồi, rồi mới tạo yêu cầu tiếp theo. Nếu sự kiện xảy ra liên tục, client có thể bỏ lỡ sự kiện vì đang trong quá trình tạo yêu cầu mới.

SSE có độ trễ gần như thời gian thực vì kết nối luôn mở và server đẩy ngay khi có sự kiện. Nhưng hướng ngược lại vẫn phải qua yêu cầu HTTP, tăng độ trễ cho tương tác hai chiều.

WebSocket đạt độ trễ thấp nhất. Tin nhắn được gửi trực tiếp qua socket TCP mà không qua xử lý HTTP. Không có thiết lập kết nối, không có hàng đợi yêu cầu. Khi người dùng nhấn gửi, tin nhắn đến server trong vài chục mili giây tùy điều kiện mạng, và phản hồi về ngay lập tức.

Đã có thử nghiệm ba cơ chế này trên cùng một ứng dụng chat. Với 1000 người dùng đồng thời gửi tin nhắn với tần suất trung bình 1 tin nhắn/phút, thăm dò (khoảng 2 giây) có độ trễ trung bình 1.2 giây và CPU server 45%. Long Polling giảm độ trễ xuống 200ms nhưng CPU vẫn ở 30% do xử lý kết nối. WebSocket chỉ có độ trễ 50ms với việc sử dụng CPU dưới 10%. Sự khác biệt không thể rõ ràng hơn.

## Tình huống thực tế và lựa chọn công nghệ

Ứng dụng chat thời gian thực là trường hợp rõ ràng nhất cho WebSocket. Người dùng cần thấy tin nhắn ngay lập tức, và cả hai phía đều liên tục gửi dữ liệu. WebSocket cung cấp độ trễ thấp nhất và hiệu quả băng thông tốt nhất. Ứng dụng chat với WebSocket cho trải nghiệm mượt mà như các ứng dụng nhắn tin gốc. Tin nhắn đến trong vòng 100ms, chỉ báo đang gõ hoạt động hoàn hảo, và server xử lý được vài nghìn kết nối đồng thời mà không vấn đề gì.

Bảng điều khiển trực tiếp và hệ thống giám sát cũng được lợi nhiều từ WebSocket hoặc SSE. Nếu bảng điều khiển chỉ cần hiển thị dữ liệu mà không gửi lệnh lên server, SSE là lựa chọn đơn giản và hiệu quả. Nhưng nếu người dùng cần tương tác với bảng điều khiển (lọc dữ liệu, gửi lệnh), WebSocket linh hoạt hơn vì giao tiếp hai chiều.

Hệ thống thông báo có thể dùng SSE hoặc WebSocket. SSE đơn giản hơn và hỗ trợ trình duyệt tốt. Nhưng nếu ứng dụng đã dùng WebSocket cho tính năng khác, việc tái sử dụng kết nối cho thông báo sẽ tiết kiệm tài nguyên hơn duy trì hai loại kết nối riêng biệt.

Công cụ chỉnh sửa cộng tác như Google Docs hoàn toàn cần WebSocket. Mỗi lần gõ phím phải được đồng bộ với độ trễ cực thấp. Các thuật toán Operational Transform hoặc CRDT yêu cầu đồng bộ hai chiều liên tục. Thăm dò hoặc SSE đơn giản không đủ nhanh.

Trò chơi và ứng dụng nhiều người chơi cũng vậy. Hành động của người chơi cần được phản ánh ngay lập tức. WebSocket cung cấp kênh hai chiều độ trễ thấp cần thiết. Thậm chí nhiều trò chơi chuyển sang WebRTC cho kết nối ngang hàng, nhưng tín hiệu vẫn qua WebSocket.

Còn những trường hợp nào nên dùng thăm dò? Thực ra rất ít. Một trường hợp hợp lý là khi cần hỗ trợ trình duyệt cũ hoặc tường lửa doanh nghiệp chặn WebSocket. HTTP Polling luôn hoạt động vì nó chỉ là các yêu cầu HTTP thông thường. Nhưng đó là sự đánh đổi phải chấp nhận cho khả năng tương thích, không phải vì hiệu năng.

## Khi nào nên dùng cái nào

Sau nhiều năm làm việc với các hệ thống thời gian thực, có thể rút ra kinh nghiệm sau. Nếu ứng dụng cần giao tiếp thời gian thực hai chiều với độ trễ thấp, WebSocket là lựa chọn mặc định. Chat, trò chơi, công cụ cộng tác, nền tảng giao dịch trực tiếp đều thuộc nhóm này.

Nếu ứng dụng chỉ cần server đẩy dữ liệu xuống client mà không cần client gửi dữ liệu liên tục, SSE là tùy chọn đơn giản và đủ dùng. Thông báo trực tiếp, bảng giá cổ phiếu, nguồn tin tức, bảng điều khiển giám sát chỉ hiển thị dữ liệu đều hoạt động tốt với SSE. Điểm cộng là SSE tự động kết nối lại khi kết nối đứt, không cần code thêm.

Thăm dò chỉ nên dùng khi không có lựa chọn nào khác. Hệ thống cũ, môi trường không hỗ trợ WebSocket, hoặc khi tần suất cập nhật thực sự thấp (vài phút một lần) thì thăm dó chấp nhận được. Nhưng hãy nhớ rằng nó không mở rộng tốt và lãng phí tài nguyên.

Một cách tiếp cận thường dùng là kết hợp lai. WebSocket cho các tính năng thời gian thực chính, dự phòng về Long Polling nếu WebSocket không khả dụng (do tường lửa hoặc proxy). Các thư viện như Socket.IO đã triển khai sẵn cơ chế dự phòng tự động này. Bắt đầu với WebSocket, nếu quá trình bắt tay thất bại, thử Long Polling, cuối cùng mới xuống thăm dò thông thường.

## Kết luận

WebSocket không phải là giải pháp vạn năng cho mọi vấn đề, nhưng nó chắc chắn là giải pháp tốt nhất cho giao tiếp thời gian thực. Việc hiểu rõ cách WebSocket hoạt động ở tầng mạng, từ quá trình bắt tay HTTP đến kết nối song công toàn phần TCP, giúp gỡ lỗi vấn đề và tối ưu hiệu năng hiệu quả hơn.

HTTP Polling và Long Polling là những giải pháp tình thế từ thời WebSocket chưa được hỗ trợ rộng rãi. Giờ đây với hỗ trợ trình duyệt gần như toàn cầu, không còn lý do để chịu đựng chi phí phụ và độ trễ của thăm dò nữa. SSE là điểm cân bằng tốt cho giao tiếp một chiều, đơn giản hơn WebSocket nhưng vẫn hiệu quả.

Khi thiết kế các hệ thống thời gian thực, hãy nghĩ về hướng luồng dữ liệu, yêu cầu độ trễ, và kỳ vọng quy mô. Những yếu tố này sẽ định hướng đến lựa chọn công nghệ đúng đắn. Đừng ngại triển khai và đo đạc các tùy chọn khác nhau. Hiệu năng thực tế thường khác xa phân tích lý thuyết, và chỉ có kiểm thử mới cho con số chính xác.

---

**Tham khảo:**

- RFC 6455 (WebSocket Protocol)
- MDN Web Docs: WebSocket API
- "High Performance Browser Networking" - Ilya Grigorik
- Socket.IO Documentation
