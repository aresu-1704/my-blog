+++
title       = "Ứng dụng Chat sử dụng TCP trong Java (Phần 1)"
author      = "Thuận An"
date        = 2025-12-18T19:00:00+07:00
draft       = false
description = "Hướng dẫn xây dựng ứng dụng Chat đơn giản sử dụng TCP trong Java"
categories  = ["Programming", "Java", "Networking"]
tags        = ["Java", "TCP/IP", "Socket", "Client-Server", "Network"]
image       = "/images/simple-chat-room.jpg"
+++

Trong lập trình mạng (Network Programming), việc xây dựng một ứng dụng Chat là bài tập "Hello World" kinh điển nhất để hiểu về giao thức TCP/IP. Trong bài viết này, chúng ta sẽ cùng nhau xây dựng một ứng dụng Chat Console (cửa sổ dòng lệnh) đơn giản giữa một Client và một Server sử dụng Java Sockets.

## 1. Kiến trúc Client-Server với TCP

Trước khi đi vào code, hãy hình dung cách hai máy tính nói chuyện với nhau. **TCP** (Transmission Control Protocol) là giao thức hướng kết nối (connection-oriented), nghĩa là một "đường ống" ổn định phải được thiết lập trước khi dữ liệu được gửi đi.

Mô hình hoạt động sẽ như sau:

- **Server**: Chạy trước, mở một cổng (Port) và "lắng nghe" (Listen) chờ đợi kết nối.
- **Client**: Biết địa chỉ IP và Port của Server, chủ động gửi yêu cầu kết nối.
- **Socket**: Khi kết nối thành công, một "Socket" được tạo ra ở cả hai đầu. Đây là nơi chúng ta ghi dữ liệu vào (Output) và đọc dữ liệu ra (Input).

## 2. Xây dựng Server (Server.java)

Server cần sử dụng lớp `ServerSocket` để mở cổng. Trong ví dụ này, chúng ta sẽ tạo một Server đơn giản: nhận tin nhắn từ Client và hiển thị lên màn hình, đồng thời cho phép Server gõ tin nhắn trả lời lại.

```java
import java.io.*;
import java.net.*;

public class Server {
    public static void main(String[] args) {
        int port = 5000; // Cổng kết nối (Port)

        try (ServerSocket serverSocket = new ServerSocket(port)) {
            System.out.println("Server đang lắng nghe tại cổng " + port);
            
            // Chờ đợi Client kết nối (Hàm này sẽ chặn chương trình đến khi có kết nối)
            Socket socket = serverSocket.accept();
            System.out.println("Client đã kết nối!");

            // Tạo luồng Input để đọc dữ liệu từ Client
            InputStream input = socket.getInputStream();
            BufferedReader reader = new BufferedReader(new InputStreamReader(input));

            // Tạo luồng Output để gửi dữ liệu tới Client
            OutputStream output = socket.getOutputStream();
            PrintWriter writer = new PrintWriter(output, true);

            // Tạo luồng đọc dữ liệu từ bàn phím (Server gõ tin nhắn)
            BufferedReader consoleReader = new BufferedReader(new InputStreamReader(System.in));

            String text;
            // Vòng lặp chat
            while (true) {
                // Đọc tin nhắn từ Client
                text = reader.readLine();
                if (text == null || "bye".equalsIgnoreCase(text)) {
                    System.out.println("Client đã ngắt kết nối.");
                    break;
                }
                System.out.println("Client: " + text);

                // Server trả lời
                System.out.print("Server: ");
                String response = consoleReader.readLine();
                writer.println(response);
            }

            socket.close();
        } catch (IOException ex) {
            System.out.println("Lỗi Server: " + ex.getMessage());
            ex.printStackTrace();
        }
    }
}
```

## 3. Xây dựng Client (Client.java)

Client sử dụng lớp `Socket` để kết nối đến Server. Lưu ý là IP `127.0.0.1` (localhost) được dùng để test trên cùng một máy.

```java
import java.io.*;
import java.net.*;

public class Client {
    public static void main(String[] args) {
        String hostname = "127.0.0.1"; // Địa chỉ IP của Server (Localhost)
        int port = 5000;

        try (Socket socket = new Socket(hostname, port)) {
            System.out.println("Đã kết nối tới Server!");

            // Luồng Output để gửi tin nhắn
            OutputStream output = socket.getOutputStream();
            PrintWriter writer = new PrintWriter(output, true);

            // Luồng Input để nhận tin nhắn
            InputStream input = socket.getInputStream();
            BufferedReader reader = new BufferedReader(new InputStreamReader(input));

            // Luồng đọc từ bàn phím
            BufferedReader consoleReader = new BufferedReader(new InputStreamReader(System.in));

            String text;
            // Vòng lặp chat
            while (true) {
                System.out.print("Client: ");
                text = consoleReader.readLine();
                
                // Gửi tin nhắn tới Server
                writer.println(text);

                if ("bye".equalsIgnoreCase(text)) {
                    System.out.println("Đã ngắt kết nối.");
                    break;
                }

                // Nhận phản hồi từ Server
                String response = reader.readLine();
                System.out.println("Server: " + response);
            }
        } catch (UnknownHostException ex) {
            System.out.println("Không tìm thấy Server: " + ex.getMessage());
        } catch (IOException ex) {
            System.out.println("Lỗi I/O: " + ex.getMessage());
        }
    }
}
```

## 4. Giải thích các thành phần chính

- **ServerSocket(port)**: Chỉ dùng ở phía Server. Nó đăng ký port với hệ điều hành và chờ.
- **socket.accept()**: Đây là method blocking (chặn). Code sẽ dừng ở dòng này cho đến khi có một Client kết nối vào.
- **new Socket(ip, port)**: Dùng ở phía Client để bắt tay (handshake) với Server.
- **BufferedReader & PrintWriter**: Java IO làm việc với byte, nhưng Chat làm việc với văn bản (String). Chúng ta bọc (wrap) các luồng byte (InputStream) vào các lớp xử lý ký tự này để có thể dùng hàm tiện lợi như `readLine()` hay `println()`.

## 5. Cách chạy ứng dụng

Để test ứng dụng này, bạn cần mở 2 cửa sổ Terminal (hoặc 2 tab Console trong IDE):

**Bước 1**: Compile cả 2 file:

```bash
javac Server.java Client.java
```

**Bước 2**: Chạy Server trước (bắt buộc):

```bash
java Server
```

Màn hình sẽ hiện: "Server đang lắng nghe tại cổng 5000"

**Bước 3**: Chạy Client ở cửa sổ Terminal thứ 2:

```bash
java Client
```

**Bước 4**: Bắt đầu chat!

- Gõ tin nhắn bên Client và nhấn Enter.
- Server nhận được và bạn có thể gõ trả lời từ phía Server.

## Tổng kết

Đây là ví dụ cơ bản nhất về **Synchronous Blocking Chat** (Chat đồng bộ chặn). Nghĩa là Client gửi 1 tin, phải chờ Server trả lời rồi mới gửi tiếp được.

Trong thực tế, để xây dựng các ứng dụng Chat chuyên nghiệp (như Messenger, Zalo), chúng ta cần áp dụng **Multi-threading** (Đa luồng) để Server có thể xử lý hàng ngàn Client cùng lúc và gửi/nhận tin nhắn bất đồng bộ. Hẹn gặp lại các bạn ở [bài viết nâng cao về "Multi-threaded Chat Server"](/post/advanced-chat-tcp-java/)!
```
