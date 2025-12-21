+++
title = "Java Socket Programming: TCP vs UDP trong ứng dụng thực tế"
date = 2025-12-22T00:44:00+07:00
draft = false
categories = ["Java", "Network Programming"]
tags = ["Java", "Socket", "TCP", "UDP", "Network", "Backend"]
series = ["Network Programming"]
difficulty = "intermediate"
description = "Phân tích chuyên sâu về TCP và UDP trong lập trình mạng Java, so sánh Socket và DatagramSocket, kèm ví dụ thực tế cho chat app, game online và streaming"
image = "images/java-tcp-udp.jpg"
+++

## Giới thiệu

Hồi học môn mạng máy tính, mình cứ nghĩ TCP và UDP chỉ khác nhau ở chỗ một cái reliable một cái không thôi. Nhưng khi code thực tế mới thấy sự khác biệt lớn hơn thế nhiều. Bài này mình sẽ đi sâu vào cả network layer lẫn Java implementation để hiểu tại sao có những ứng dụng phải dùng TCP, có những ứng dụng lại chỉ chạy tốt với UDP.

## TCP: Transmission Control Protocol

### TCP Handshake - Cái bắt tay 3 bước tốn thời gian

Trước khi gửi bất kỳ data nào, TCP phải thiết lập kết nối qua 3-way handshake. Client gửi một segment với cờ SYN kèm theo sequence number ngẫu nhiên (gọi là ISN - Initial Sequence Number). Server nhận được thì gửi lại SYN-ACK, vừa xác nhận ISN của client vừa gửi ISN của chính nó. Cuối cùng client gửi ACK để xác nhận ISN của server.

<p align="center">
  <img src="/images/tcp-3-way.png" alt="JavaScript Client-Side" />
</p>

<p align="center">
  <em>TCP 3 bước bắt tay</em>
</p>

Nghe có vẻ đơn giản nhưng quá trình này tốn **1.5 RTT** (Round-Trip Time). Nếu client và server ở xa nhau thì latency này khá đáng kể. Chưa kể cả hai bên phải giữ connection state trong memory. Khi đóng kết nối lại phải 4-way handshake nữa, thêm 2 RTT nữa.

### TCP đảm bảo reliable như thế nào?

TCP không tin tưởng network layer. Nó tự implement reliability bằng cách đánh số thứ tự cho từng byte data. Khi receiver nhận được data, nó gửi ACK packet ngược lại để báo "tao đã nhận đến byte số X rồi". Sender sẽ giữ data trong buffer cho đến khi nhận được ACK.

Nếu sender không nhận được ACK sau một khoảng thời gian (gọi là RTO - Retransmission Timeout), nó sẽ gửi lại data đó. Có một trick tối ưu là **Fast Retransmit**: nếu sender nhận được 3 duplicate ACK liên tiếp, nó biết ngay là packet bị mất và gửi lại luôn thay vì đợi timeout.

Chi phí của reliability này là gì? Mỗi ACK packet tạo overhead, retransmission gây delay, và buffer memory cho unacknowledged data khá tốn tài nguyên.

### Ordering - Data đến đúng thứ tự

Giả sử bạn gửi 3 packets qua network, packet 2 đi chậm hơn packet 3. TCP ở receiver sẽ sắp xếp lại theo sequence number và buffer packet 3 cho đến khi packet 2 đến. Application layer nhận data theo đúng thứ tự đã gửi, không bao giờ bị lộn xộn.

Điều này quan trọng với những ứng dụng như chat (tin nhắn phải hiện theo thứ tự), file transfer (byte sequence phải đúng), nhưng lại gây vấn đề cho real-time app (mình sẽ nói sau).

### Congestion Control - TCP "biết điều"

TCP có khả năng tự điều chỉnh tốc độ gửi dựa trên tình trạng mạng. Ban đầu nó bắt đầu chậm với congestion window (cwnd) = 1 MSS, sau đó tăng gấp đôi mỗi RTT (**Slow Start**). Khi đạt đến threshold, nó chuyển sang tăng tuyến tính (**Congestion Avoidance**).

Nếu phát hiện packet loss (qua timeout hoặc duplicate ACK), TCP giảm cwnd xuống. Điều này giúp TCP "công bằng" với các connection khác trên mạng, nhưng lại làm throughput giảm khi mạng tắc nghẽn - không tốt cho ứng dụng streaming hay gaming.

## UDP: User Datagram Protocol

### UDP - Gửi thẳng không cần hỏi han

UDP khác TCP từ triết lý thiết kế. Nó không có khái niệm "connection". Bạn muốn gửi data? Đóng gói vào datagram và ném đi thôi, không cần handshake, không cần ACK, không cần biết bên kia có nhận được hay không.

Mỗi datagram của UDP hoàn toàn độc lập. Không có sequence number, không có connection state, không có gì cả. Đơn giản và nhanh.

### Tại sao UDP lại nhanh?

Thứ nhất, không mất thời gian thiết lập kết nối. Ngay khi bắt đầu chương trình, UDP gửi data được luôn. TCP phải đợi 1.5 RTT mới bắt đầu được.

Thứ hai, header của UDP chỉ 8 bytes so với 20-60 bytes của TCP. Ít overhead hơn nghĩa là bandwidth hiệu quả hơn.

Thứ ba, không có retransmission. Packet mất thì mất, UDP không quan tâm. Application nhận được gì thì nhận, không nhận được thì thôi. Không có ACK nghĩa là latency cực thấp.

Thứ tư, UDP không có congestion control. Nó gửi với tốc độ cố định mà application muốn, không tự động giảm tốc khi mạng tắc.

### Đánh đổi của UDP

Reliability bay hơi hết. Packet có thể mất, có thể bị duplicate, UDP chẳng quan tâm. Application muốn reliability thì phải tự code.

Ordering cũng không có. Datagram có thể đến lộn xộn thứ tự. Bạn gửi packet 1, 2, 3 nhưng receiver có thể nhận 1, 3, 2. Application phải tự handle nếu cần.

Flow control không tồn tại. Sender có thể gửi nhanh hơn receiver xử lý được, dẫn đến tràn buffer và mất data.

Congestion control cũng không có. UDP có thể gây tắc nghẽn mạng mà không biết. Nếu quan tâm đến fairness với các connection khác, application phải tự implement.

## Socket Programming trong Java

### TCP Socket - Connection-oriented

TCP trong Java dùng class `Socket` (client) và `ServerSocket` (server). Cái hay của TCP Socket là nó cho ta stream-based API, đọc ghi như file vậy.

**Server side:**

```java
import java.net.*;
import java.io.*;

public class TCPServer {
    public static void main(String[] args) throws IOException {
        // Tạo ServerSocket lắng nghe trên port 8080
        ServerSocket serverSocket = new ServerSocket(8080);
        System.out.println("Server listening on port 8080");
        
        // Accept connection (blocking call - chờ cho đến khi có client)
        Socket clientSocket = serverSocket.accept();
        System.out.println("Client connected: " + clientSocket.getRemoteSocketAddress());
        
        // Stream để đọc/ghi dữ liệu - giống như đọc/ghi file
        BufferedReader in = new BufferedReader(
            new InputStreamReader(clientSocket.getInputStream())
        );
        PrintWriter out = new PrintWriter(clientSocket.getOutputStream(), true);
        
        // Nhận message từ client
        String message = in.readLine();
        System.out.println("Received: " + message);
        
        // Gửi phản hồi
        out.println("Echo: " + message);
        
        // Đóng kết nối
        clientSocket.close();
        serverSocket.close();
    }
}
```

**Client side:**

```java
import java.net.*;
import java.io.*;

public class TCPClient {
    public static void main(String[] args) throws IOException {
        // Kết nối đến server - lúc này 3-way handshake diễn ra
        Socket socket = new Socket("localhost", 8080);
        System.out.println("Connected to server");
        
        // Stream để đọc/ghi
        PrintWriter out = new PrintWriter(socket.getOutputStream(), true);
        BufferedReader in = new BufferedReader(
            new InputStreamReader(socket.getInputStream())
        );
        
        // Gửi message
        out.println("Hello Server");
        
        // Nhận phản hồi
        String response = in.readLine();
        System.out.println("Server response: " + response);
        
        // Đóng socket
        socket.close();
    }
}
```

Chú ý rằng `accept()` và `read()` đều là **blocking call**. Thread sẽ dừng lại đợi cho đến khi có client kết nối hoặc có data đến. Trong production, ta thường dùng multi-threading hoặc NIO để handle nhiều clients.

### UDP Socket - Connectionless

UDP dùng `DatagramSocket` cho cả client lẫn server. Khác với TCP, ta không gọi `connect()` hay `accept()`. Muốn gửi data thì pack vào `DatagramPacket` và `send()` thôi.

**Server side:**

```java
import java.net.*;

public class UDPServer {
    public static void main(String[] args) throws Exception {
        // Tạo DatagramSocket bind vào port 9090
        DatagramSocket socket = new DatagramSocket(9090);
        System.out.println("UDP Server started on port 9090");
        
        byte[] receiveBuffer = new byte[1024];
        
        while (true) {
            // Nhận datagram - blocking nhưng không cần accept trước
            DatagramPacket receivePacket = new DatagramPacket(
                receiveBuffer, receiveBuffer.length
            );
            socket.receive(receivePacket);
            
            String message = new String(receivePacket.getData(), 0, 
                receivePacket.getLength());
            System.out.println("Received: " + message);
            
            // Lấy địa chỉ client từ packet vừa nhận
            InetAddress clientAddress = receivePacket.getAddress();
            int clientPort = receivePacket.getPort();
            
            // Gửi phản hồi
            String response = "Echo: " + message;
            byte[] sendData = response.getBytes();
            DatagramPacket sendPacket = new DatagramPacket(
                sendData, sendData.length, clientAddress, clientPort
            );
            socket.send(sendPacket);
        }
    }
}
```

**Client side:**

```java
import java.net.*;

public class UDPClient {
    public static void main(String[] args) throws Exception {
        // Tạo DatagramSocket - không cần connect
        DatagramSocket socket = new DatagramSocket();
        
        // Chuẩn bị data để gửi
        String message = "Hello UDP Server";
        byte[] sendData = message.getBytes();
        
        // Tạo packet với địa chỉ đích
        InetAddress serverAddress = InetAddress.getByName("localhost");
        DatagramPacket sendPacket = new DatagramPacket(
            sendData, sendData.length, serverAddress, 9090
        );
        
        // Gửi datagram - không đảm bảo sẽ đến
        socket.send(sendPacket);
        System.out.println("Sent: " + message);
        
        // Nhận phản hồi
        byte[] receiveBuffer = new byte[1024];
        DatagramPacket receivePacket = new DatagramPacket(
            receiveBuffer, receiveBuffer.length
        );
        socket.receive(receivePacket);
        
        String response = new String(receivePacket.getData(), 0, 
            receivePacket.getLength());
        System.out.println("Server response: " + response);
        
        socket.close();
    }
}
```

Điều lưu ý với UDP là phải chỉ định kích thước buffer trước. Mỗi datagram có giới hạn 64KB (thực tế thường dùng dưới 1500 bytes để tránh IP fragmentation).

### So sánh nhanh

| Tiêu chí | TCP Socket | UDP DatagramSocket |
|----------|-----------|-------------------|
| **API** | `Socket`, `ServerSocket` | `DatagramSocket` |
| **Connection** | Cần `connect()` và `accept()` | Không cần |
| **Data model** | Stream (InputStream/OutputStream) | Message (DatagramPacket) |
| **Reliability** | Đảm bảo delivery | Best effort |
| **Ordering** | Đảm bảo thứ tự | Không đảm bảo |
| **Overhead** | Header 20-60 bytes | Header 8 bytes |
| **Use case** | HTTP, File transfer, Chat | DNS, Gaming, Streaming |

## Phân tích tình huống thực tế

### Chat Application

Nếu bạn làm một app chat như Messenger hay Telegram, chọn gì? Câu trả lời là TCP, và lý do rất đơn giản: tin nhắn không được phép mất.

Tưởng tượng bạn gửi "Hẹn gặp lúc 7h nhé" nhưng message mất giữa đường và người kia không nhận được. Đó là disaster. TCP đảm bảo mọi message đều đến đích. Hơn nữa, tin nhắn phải hiển thị đúng thứ tự. Nếu bạn gửi "Alo" rồi "Khỏe không?", người nhận thấy "Khỏe không?" trước "Alo" thì trông rất weird.

Latency của chat app thường không quá critical. Delay 100-500ms là chấp nhận được. User không cần realtime như game, chậm vài trăm ms không ai để ý. Vì vậy overhead của TCP (3-way handshake, ACK) là acceptable trade-off.

Thêm một lợi ích nữa: TCP connection state giúp ta biết user online hay offline. WebSocket (protocol chạy trên TCP) duy trì long-lived connection, server có thể push notification xuống client ngay lập tức.

```java
// Server pattern cho chat: một thread per client
ServerSocket serverSocket = new ServerSocket(8080);
while (true) {
    Socket client = serverSocket.accept();
    new Thread(new ChatHandler(client)).start(); // handle client riêng
}
```

### Game Online (Real-time Multiplayer)

Game online là trường hợp ngược lại hoàn toàn. Ở đây, **latency là king**. Bạn chơi một game FPS và nhấn shoot, nếu action delay 200ms thì game chơi như shit. UDP là lựa chọn duy nhất.

Trong game, client liên tục gửi player position đến server với tần suất 20-60 lần/giây. Nếu dùng TCP, mỗi packet cần ACK - đó là overhead khủng khiếp. Worse hơn nữa là **head-of-line blocking**: nếu packet 100 bị mất, TCP sẽ block packet 101, 102 cho đến khi retransmit packet 100 thành công. Nhưng trong game, vị trí ở frame 100 đã stale rồi, frame 102 mới là dữ liệu fresh.

UDP gửi packet và quên đi. Packet mất? No problem, vài frame sau sẽ có update mới. Game player sẽ thấy nhân vật giật một chút nhưng không bị lag nặng như TCP.

Tất nhiên, UDP không reliable nên ta phải tự code logic xử lý:

**Client-side prediction**: Client dự đoán vị trí của mình trước khi server confirm, để movement mượt mà. Khi server gửi state thực về, client reconcile lại.

**Redundancy**: Những event quan trọng (như player tử vong) được gửi nhiều lần để đảm bảo server nhận được.

**Sequence number** ở application level để detect out-of-order packets.

```java
// Client gửi vị trí liên tục
DatagramSocket socket = new DatagramSocket();
while (gameRunning) {
    String position = "POS:" + x + "," + y + "," + timestamp;
    byte[] data = position.getBytes();
    socket.send(new DatagramPacket(data, data.length, serverAddr, port));
    Thread.sleep(16); // ~60 FPS
}
```

Một pattern hay là **hybrid approach**: dùng UDP cho player movement (frequent, ephemeral), nhưng dùng TCP cho chat, inventory, và critical events (infrequent, important).

### Video Streaming

Streaming video phức tạp hơn vì có hai trường hợp khác nhau: Live streaming và Video on Demand (VOD).

**Live streaming** (Twitch, Zoom) cần latency thấp. Bạn không thể buffer 30 giây vì đó là live stream. UDP là lựa chọn tốt hơn. Nếu mất vài frames video thì chỉ thấy artifact nhỏ trong vài milliseconds, không critical. Data cũ không có giá trị - nếu packet bị delay thì client không cần nữa vì frame mới đã đến.

Trong thực tế, live streaming dùng **RTP (Real-time Transport Protocol)** chạy trên UDP. WebRTC (dùng cho peer-to-peer streaming) cũng dùng UDP. RTMP (protocol cũ dùng TCP) đã bị deprecated vì latency quá cao.

Để xử lý packet loss, live streaming thường dùng **Forward Error Correction (FEC)**: thêm redundant data vào stream để có thể recover lost packets mà không cần retransmission.

**VOD** (YouTube, Netflix) lại khác. Client có thể buffer trước 5-30 giây nên latency không quan trọng. Thay vào đó, chất lượng video phải perfect - không ai chấp nhận artifact trong phim họ đang xem. TCP là lựa chọn đúng đắn.

HLS (HTTP Live Streaming) và DASH đều dùng HTTP/TCP. Video được chia thành segments nhỏ (2-10 giây), client request từng segment qua HTTP. Nếu bandwidth giảm, client tự động switch xuống quality thấp hơn (**adaptive streaming**). Reliable delivery của TCP đảm bảo mỗi segment đến đầy đủ.

Thêm nữa, TCP-based streaming tương thích tốt với infrastructure hiện tại: CDN, proxy, firewall đều support HTTP sẵn rồi.

| Tiêu chí | Live Streaming (UDP) | VOD (TCP) |
|----------|---------------------|-----------|
| Latency | < 1s | 5-30s buffer OK |
| Quality | Chấp nhận mất frames | Perfect delivery |
| Protocol | RTP, WebRTC | HLS, DASH |
| Example | Twitch, Zoom | YouTube, Netflix |

## Kết luận: Khi nào dùng cái nào?

### Dùng TCP khi

Ứng dụng cần **reliability và correctness** hơn là speed. File transfer, REST API, database connections, email, financial transactions - tất cả đều cần data đến đầy đủ và đúng thứ tự. Latency cao hơn một chút là chấp nhận được để đổi lấy guarantee.

Một lợi ích khác là infrastructure support. Firewall, proxy, CDN đều được thiết kế để handle TCP/HTTP tốt. Nếu app của bạn cần đi qua corporate firewall, TCP gần như chắc chắn work.

### Dùng UDP khi

Ứng dụng cần **low latency** và real-time data. VoIP, video conferencing, online gaming, live streaming, IoT sensor data - những thứ này cần data fresh hơn là data complete. Stale data không có giá trị, chậm còn tệ hơn mất data.

Tất nhiên bạn phải tự xử lý reliability nếu cần. Protocols như QUIC (dùng cho HTTP/3) và RTP chạy trên UDP nhưng tự implement một số tính năng của TCP ở application layer.

### Xu hướng hiện đại: QUIC

Google phát triển **QUIC** (Quick UDP Internet Connections) và hiện HTTP/3 chạy trên QUIC over UDP. QUIC kết hợp ưu điểm của cả hai bên: reliability của TCP nhưng latency thấp hơn.

QUIC có multiplexing mà không bị head-of-line blocking (vấn đề lớn của TCP), support 0-RTT connection establishment (không cần 3-way handshake), và tích hợp sẵn TLS encryption.

**Lesson learned**: Không có protocol "tốt nhất cho mọi trường hợp". Có protocol "phù hợp nhất với use case của bạn". Hiểu rõ trade-offs để đưa ra quyết định đúng.

---

**Tham khảo:**

- RFC 793 (TCP), RFC 768 (UDP)
- "Computer Networking: A Top-Down Approach" - Kurose & Ross
- Java Network Programming (O'Reilly)
