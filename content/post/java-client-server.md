+++
title = "Java Client–Server"
date = 2025-12-16T19:00:00+07:00
draft = false
categories = ["Programming", "Java", "Networking"]
tags = ["Java", "Client-Server", "TCP/IP", "Socket", "Network"]
description = "Tổng quan và hướng dẫn lập trình mô hình Client–Server bằng Java, giải thích cách giao tiếp giữa client và server."
author = "Aresu"
image = "/images/java-socket-programming-process.jpg"
+++

Networking (Lập trình mạng) là trái tim của hầu hết các ứng dụng hiện đại, từ Web server, chat app cho đến các game online. Trong bài viết này, chúng ta sẽ đi sâu vào mô hình Client–Server sử dụng Java. Mình sẽ hướng dẫn bạn từ khái niệm cơ bản nhất cho đến việc viết code một ứng dụng chat đơn giản giữa hai máy tính.

## 1. Mô hình Client-Server là gì?

Trước khi viết code, chúng ta cần hiểu kiến trúc này hoạt động như thế nào.

**Server (Máy chủ)**: Là một chương trình chạy trên một máy tính, luôn ở trạng thái "lắng nghe" (listening) tại một cổng (port) xác định. Nhiệm vụ của nó là chờ đợi yêu cầu kết nối từ Client và xử lý yêu cầu đó.

**Client (Máy khách)**: Là chương trình chủ động gửi yêu cầu kết nối đến Server (thông qua địa chỉ IP và Port) để trao đổi dữ liệu.

![Mô hình Client-Server](/images/java-client-server.jpg)

Trong Java, giao tiếp này thường dựa trên giao thức **TCP/IP** (Transmission Control Protocol/Internet Protocol) để đảm bảo dữ liệu được truyền đi tin cậy, không bị mất gói tin.

## 2. Các khái niệm cốt lõi trong Java Networking

Để lập trình mạng trong Java, bạn sẽ làm việc chủ yếu với gói `java.net`. Dưới đây là những "nhân vật chính":

### a. IP Address và Port

Hãy tưởng tượng IP Address là "địa chỉ nhà", còn Port là "số phòng" trong ngôi nhà đó.

- Để tìm thấy máy chủ, Client cần **IP Address**.
- Để biết ứng dụng nào trên máy chủ sẽ nhận dữ liệu (Web server, Mail server hay Chat server), Client cần **Port Number**.

### b. Socket

Socket là "đầu mối" kết nối. Khi Client và Server kết nối thành công, một đường ống ảo (virtual pipe) được tạo ra. Hai bên sẽ gửi và nhận dữ liệu thông qua đường ống này bằng các Socket.

- **ServerSocket**: Class chỉ dùng cho phía Server. Nhiệm vụ duy nhất là chờ đợi và chấp nhận kết nối.
- **Socket**: Class dùng cho cả Client (để kết nối) và Server (để giao tiếp sau khi đã chấp nhận kết nối).

## 3. Quy trình giao tiếp (Workflow)

Quy trình giao tiếp tiêu chuẩn gồm 4 bước:

1. **Server khởi tạo**: Tạo ServerSocket và gắn vào một cổng (bind port), ví dụ cổng 5000.
2. **Server lắng nghe**: Gọi hàm `accept()` và chờ đợi. Lúc này chương trình Server sẽ tạm dừng (block) cho đến khi có ai đó gõ cửa.
3. **Client kết nối**: Tạo Socket với tham số là IP của Server và cổng 5000.
4. **Trao đổi dữ liệu**: Server chấp nhận kết nối. Cả hai bên sử dụng InputStream (để đọc) và OutputStream (để ghi) nhằm gửi tin nhắn qua lại.

## 4. Thực hành: Xây dựng ứng dụng Echo (A-Z)

Chúng ta sẽ viết một ứng dụng đơn giản: Client gửi một câu chào, Server nhận được và trả lời lại.

### Bước 1: Viết chương trình Server (SimpleServer.java)

```java
import java.io.*;
import java.net.*;

public class SimpleServer {
    public static void main(String[] args) {
        // Cổng giao tiếp, cần chọn cổng > 1023 để tránh xung đột hệ thống
        final int PORT = 5000;

        try {
            // 1. Tạo ServerSocket và lắng nghe tại cổng PORT
            ServerSocket serverSocket = new ServerSocket(PORT);
            System.out.println("Server đang khởi động...");
            System.out.println("Đang chờ kết nối tại cổng " + PORT + "...");

            // 2. Chờ chấp nhận kết nối từ Client (Chương trình sẽ dừng tại đây cho đến khi có kết nối)
            Socket socket = serverSocket.accept();
            System.out.println("Đã kết nối thành công với Client: " + socket.getInetAddress());

            // 3. Tạo luồng nhập/xuất dữ liệu
            // Đọc dữ liệu từ Client gửi lên
            BufferedReader in = new BufferedReader(new InputStreamReader(socket.getInputStream()));
            // Gửi dữ liệu trả về Client
            PrintWriter out = new PrintWriter(socket.getOutputStream(), true);

            // 4. Đọc tin nhắn từ Client
            String clientMessage = in.readLine();
            System.out.println("Client nói: " + clientMessage);

            // 5. Phản hồi lại Client
            String response = "Chào Client, Server đã nhận được tin nhắn: '" + clientMessage + "'";
            out.println(response);

            // 6. Đóng kết nối
            socket.close();
            serverSocket.close();

        } catch (IOException e) {
            e.printStackTrace();
        }
    }
}
```

**Giải thích code:**

- `ServerSocket(PORT)`: Mở cổng 5000.
- `accept()`: Phương thức quan trọng nhất, nó "bắt" lấy yêu cầu kết nối.
- `BufferedReader & PrintWriter`: Dùng để đọc/ghi chuỗi văn bản (String) thay vì từng byte lẻ tẻ, giúp code gọn hơn.

### Bước 2: Viết chương trình Client (SimpleClient.java)

```java
import java.io.*;
import java.net.*;

public class SimpleClient {
    public static void main(String[] args) {
        // Địa chỉ server (localhost là máy hiện tại)
        final String SERVER_IP = "127.0.0.1";
        final int SERVER_PORT = 5000;

        try {
            System.out.println("Đang kết nối đến Server...");
            
            // 1. Tạo Socket để kết nối đến Server
            Socket socket = new Socket(SERVER_IP, SERVER_PORT);
            System.out.println("Đã kết nối!");

            // 2. Tạo luồng nhập/xuất
            BufferedReader in = new BufferedReader(new InputStreamReader(socket.getInputStream()));
            PrintWriter out = new PrintWriter(socket.getOutputStream(), true);

            // 3. Gửi tin nhắn đến Server
            String message = "Xin chào Server, mình là Client!";
            out.println(message);
            System.out.println("Đã gửi tin nhắn: " + message);

            // 4. Nhận phản hồi từ Server
            String response = in.readLine();
            System.out.println("Server phản hồi: " + response);

            // 5. Đóng kết nối
            socket.close();

        } catch (IOException e) {
            System.out.println("Không thể kết nối đến Server.");
            e.printStackTrace();
        }
    }
}
```

### Bước 3: Chạy và kiểm thử

Để thấy kết quả, bạn cần chạy 2 chương trình này song song (tốt nhất là trên 2 cửa sổ Terminal hoặc 2 tab Console trong IDE).

1. **Chạy SimpleServer.java trước**: Bạn sẽ thấy dòng "Đang chờ kết nối...".
2. **Chạy SimpleClient.java sau**: Ngay lập tức Client sẽ kết nối.

## 5. Nâng cao: Xử lý đa luồng (Multi-threading)

Vấn đề của đoạn code trên là Server chỉ phục vụ được một Client duy nhất tại một thời điểm. Nếu Client A đang kết nối, Client B sẽ phải chờ.

Trong thực tế, để Server phục vụ hàng ngàn người cùng lúc, chúng ta cần sử dụng **Multi-threading** (Đa luồng).

**Ý tưởng:**

- Vòng lặp `while(true)` ở Server để liên tục chấp nhận kết nối (`accept()`).
- Mỗi khi có một Client kết nối thành công, Server sẽ tạo ra một Thread riêng biệt để phục vụ Client đó.
- Server chính lại quay về vòng lặp để đợi Client tiếp theo.

**Mô hình giả lập (Pseudo-code):**

```java
while (true) {
    Socket socket = serverSocket.accept(); // Chấp nhận Client mới
    // Giao việc cho nhân viên mới (Thread mới)
    Thread worker = new Thread(new ClientHandler(socket));
    worker.start();
}
```

## 6. Lời kết

Lập trình Client-Server với Java thoạt nhìn có vẻ phức tạp với nhiều khái niệm về Stream và Socket, nhưng bản chất chỉ là việc mở một đường ống và đẩy dữ liệu qua lại.

Nắm vững kiến thức này là bước đệm quan trọng để bạn tiến tới các kỹ thuật cao cấp hơn như:

- Non-blocking I/O (Java NIO).
- Lập trình Web Server (Spring Boot thực chất cũng chạy trên nền tảng Socket).
- Lập trình Game Real-time.

Hy vọng bài viết này giúp bạn có cái nhìn tổng quan và tự tay viết được ứng dụng mạng đầu tiên của mình!
