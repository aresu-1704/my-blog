+++
title       = "Ứng dụng Chat sử dụng TCP trong Java (Phần 2)"
author      = "Thuận An"
date        = 2025-12-20T19:00:00+07:00
draft       = false
description = "Hướng dẫn xây dựng ứng dụng Chat nâng cao sử dụng TCP trong Java nâng cao bằng Multi-threads"
categories  = ["Programming", "Java", "Networking"]
tags        = ["Java", "TCP/IP", "Socket", "Client-Server", "Network"]
image       = "images/multi-thread-example.jpg"
+++

Trong phần trước, chúng ta đã kết nối được Client và Server. Tuy nhiên, nó có một điểm yếu chết người: **Blocking I/O**. Khi code chạy lệnh `readLine()`, chương trình bị "đơ" để chờ tin nhắn, khiến bạn không thể gõ tin nhắn gửi đi trong lúc đang chờ nhận.

Để giải quyết, chúng ta cần sử dụng **Threads (Luồng)**.

- **Server**: Cần một luồng chính để đón khách, và mỗi khi có khách (Client) mới, server sẽ tạo riêng một luồng con (Worker Thread) để phục vụ vị khách đó.
- **Client**: Cần tách việc "Gửi tin" và "Nhận tin" ra làm 2 luồng chạy song song.

Dưới đây là mã nguồn chi tiết cho một hệ thống **Chat Room hoàn chỉnh**.

## 1. Xây dựng Server Đa Luồng (ChatServer.java)

Server này có khả năng:

- Chấp nhận nhiều kết nối cùng lúc.
- Lưu danh sách các người dùng đang online.
- Khi một người nhắn, Server sẽ **Broadcast** (phát loa) tin nhắn đó tới tất cả những người khác.

```java
import java.io.*;
import java.net.*;
import java.util.*;

public class ChatServer {
    private int port;
    // Set dùng để lưu danh sách các user unique, tránh trùng lặp
    private Set<String> userNames = new HashSet<>();
    // Set lưu trữ các luồng viết của từng client để broadcast tin nhắn
    private Set<UserThread> userThreads = new HashSet<>();

    public ChatServer(int port) {
        this.port = port;
    }

    public void execute() {
        try (ServerSocket serverSocket = new ServerSocket(port)) {
            System.out.println("Chat Server đang chạy trên cổng " + port);

            while (true) {
                // Vòng lặp vô tận để liên tục chấp nhận kết nối mới
                Socket socket = serverSocket.accept();
                System.out.println("New user connected");

                // Với mỗi user mới, tạo một Thread riêng để xử lý
                UserThread newUser = new UserThread(socket, this);
                userThreads.add(newUser);
                newUser.start(); // Bắt đầu luồng
            }
        } catch (IOException ex) {
            System.out.println("Lỗi Server: " + ex.getMessage());
            ex.printStackTrace();
        }
    }

    public static void main(String[] args) {
        ChatServer server = new ChatServer(5000);
        server.execute();
    }

    /**
     * Gửi tin nhắn đến TẤT CẢ các user khác (Broadcast)
     */
    void broadcast(String message, UserThread excludeUser) {
        for (UserThread aUser : userThreads) {
            if (aUser != excludeUser) {
                aUser.sendMessage(message);
            }
        }
    }

    /**
     * Lưu tên user mới
     */
    void addUserName(String userName) {
        userNames.add(userName);
    }

    /**
     * Xóa user khi họ thoát
     */
    void removeUser(String userName, UserThread aUser) {
        boolean removed = userNames.remove(userName);
        if (removed) {
            userThreads.remove(aUser);
            System.out.println("User " + userName + " đã thoát.");
        }
    }

    Set<String> getUserNames() {
        return this.userNames;
    }

    boolean hasUsers() {
        return !this.userNames.isEmpty();
    }
}
```

### Server Helper: UserThread.java

Đây là lớp "công nhân" xử lý riêng cho từng kết nối.

```java
import java.io.*;
import java.net.*;

public class UserThread extends Thread {
    private Socket socket;
    private ChatServer server;
    private PrintWriter writer;

    public UserThread(Socket socket, ChatServer server) {
        this.socket = socket;
        this.server = server;
    }

    public void run() {
        try {
            // Setup luồng vào/ra
            InputStream input = socket.getInputStream();
            BufferedReader reader = new BufferedReader(new InputStreamReader(input));

            OutputStream output = socket.getOutputStream();
            writer = new PrintWriter(output, true);

            printUsers();

            // Dòng đầu tiên client gửi sang sẽ là Tên
            String userName = reader.readLine();
            server.addUserName(userName);

            String serverMessage = "User mới tham gia: " + userName;
            server.broadcast(serverMessage, this);

            // Vòng lặp chat
            String clientMessage;
            do {
                clientMessage = reader.readLine();
                if (clientMessage != null) {
                    serverMessage = "[" + userName + "]: " + clientMessage;
                    server.broadcast(serverMessage, this);
                }
            } while (!clientMessage.equals("bye")); // Gõ 'bye' để thoát

            server.removeUser(userName, this);
            socket.close();

            serverMessage = userName + " đã rời phòng chat.";
            server.broadcast(serverMessage, this);

        } catch (IOException ex) {
            System.out.println("Lỗi trong UserThread: " + ex.getMessage());
        }
    }

    /**
     * Gửi danh sách người đang online cho người mới vào
     */
    void printUsers() {
        if (server.hasUsers()) {
            writer.println("Đang online: " + server.getUserNames());
        } else {
            writer.println("Chưa có ai online.");
        }
    }

    /**
     * Hàm gửi tin nhắn xuống Client của thread này
     */
    void sendMessage(String message) {
        writer.println(message);
    }
}
```

## 2. Xây dựng Client Bất đồng bộ (ChatClient.java)

Ở phía Client, chúng ta cần tách việc **Đọc (Read)** và **Ghi (Write)** ra làm 2 luồng riêng biệt để chúng không chặn nhau.

```java
import java.net.*;
import java.io.*;

public class ChatClient {
    private String hostname;
    private int port;
    private String userName;

    public ChatClient(String hostname, int port) {
        this.hostname = hostname;
        this.port = port;
    }

    public void execute() {
        try {
            Socket socket = new Socket(hostname, port);

            System.out.println("Đã kết nối vào phòng chat!");

            // Thread 1: Chuyên nghe tin nhắn từ Server
            new ReadThread(socket, this).start();

            // Thread 2: Chuyên gửi tin nhắn đi (Main thread)
            new WriteThread(socket, this).start();

        } catch (UnknownHostException ex) {
            System.out.println("Không tìm thấy Server: " + ex.getMessage());
        } catch (IOException ex) {
            System.out.println("Lỗi I/O: " + ex.getMessage());
        }
    }

    void setUserName(String userName) {
        this.userName = userName;
    }

    String getUserName() {
        return this.userName;
    }

    public static void main(String[] args) {
        ChatClient client = new ChatClient("127.0.0.1", 5000);
        client.execute();
    }
}
```

### Client Helper 1: ReadThread.java (Luồng Đọc)

Nhiệm vụ: Liên tục lắng nghe xem có tin nhắn mới từ Server không và in ra màn hình.

```java
import java.io.*;
import java.net.*;

public class ReadThread extends Thread {
    private BufferedReader reader;
    private Socket socket;
    private ChatClient client;

    public ReadThread(Socket socket, ChatClient client) {
        this.socket = socket;
        this.client = client;
        try {
            InputStream input = socket.getInputStream();
            reader = new BufferedReader(new InputStreamReader(input));
        } catch (IOException ex) {
            System.out.println("Lỗi lấy Input Stream: " + ex.getMessage());
            ex.printStackTrace();
        }
    }

    public void run() {
        while (true) {
            try {
                String response = reader.readLine();
                if (response == null) {
                    System.out.println("\nServer đã ngắt kết nối.");
                    break;
                }
                // In tin nhắn từ người khác ra màn hình
                // Dùng \r để đưa con trỏ về đầu dòng (trick giao diện)
                System.out.println("\n" + response); 
                
                // In lại dấu nhắc nhập liệu để người dùng biết mình đang ở đâu
                if (client.getUserName() != null) {
                    System.out.print("[" + client.getUserName() + "]: ");
                }
            } catch (IOException ex) {
                System.out.println("Lỗi đọc dữ liệu: " + ex.getMessage());
                break;
            }
        }
    }
}
```

### Client Helper 2: WriteThread.java (Luồng Ghi)

Nhiệm vụ: Đọc từ bàn phím người dùng và gửi sang Server.

```java
import java.io.*;
import java.net.*;
import java.util.Scanner;

public class WriteThread extends Thread {
    private PrintWriter writer;
    private Socket socket;
    private ChatClient client;

    public WriteThread(Socket socket, ChatClient client) {
        this.socket = socket;
        this.client = client;
        try {
            OutputStream output = socket.getOutputStream();
            writer = new PrintWriter(output, true);
        } catch (IOException ex) {
            System.out.println("Lỗi lấy Output Stream: " + ex.getMessage());
            ex.printStackTrace();
        }
    }

    public void run() {
        // Nếu chạy trong IDE (Eclipse/IntelliJ) thì Console có thể null, fallback về Scanner
        Scanner scanner = new Scanner(System.in); 

        System.out.print("Nhập tên của bạn: ");
        String userName = scanner.nextLine();
        client.setUserName(userName);
        writer.println(userName); // Gửi tên lên server đầu tiên

        String text;
        do {
            System.out.print("[" + userName + "]: ");
            text = scanner.nextLine();
            writer.println(text);
        } while (!text.equals("bye"));

        try {
            socket.close();
        } catch (IOException ex) {
            System.out.println("Lỗi khi ghi dữ liệu: " + ex.getMessage());
        }
    }
}
```

## 3. Phân tích kỹ thuật (Technical Deep Dive)

### Tại sao lại cần Set\<UserThread\>?

Trong file `ChatServer.java`, tôi sử dụng `Set` thay vì `List`.

**Lý do**: Chúng ta cần đảm bảo danh sách kết nối là duy nhất. `Set` giúp quản lý việc thêm/xóa user nhanh hơn và tránh việc gửi tin nhắn 2 lần cho cùng một người nếu code có lỗi logic.

### Logic của hàm broadcast()

Đây là **trái tim** của Chat Room.

1. Server nhận tin từ User A.
2. Server lặp qua danh sách `Set<UserThread>` (chứa User A, B, C...).
3. Nó kiểm tra `if (aUser != excludeUser)`: Nếu người trong danh sách không phải là người vừa gửi tin (User A), thì gửi tin nhắn đó đi. Điều này tránh việc User A tự nhận lại tin nhắn mình vừa gửi.

### Vấn đề Concurrency (Đồng thời)

Trong mã nguồn trên, tôi đã tối giản để dễ hiểu. Tuy nhiên trong môi trường **Production** thực tế, biến `userNames` và `userThreads` nên được thay thế bằng `Collections.synchronizedSet(...)` hoặc `ConcurrentHashMap` để tránh lỗi **Race Condition** (Tranh chấp luồng) khi có 2 người cùng thoát ra hoặc cùng đăng nhập chính xác tại một thời điểm.

## 4. Chạy thử nghiệm

Để thấy điều kỳ diệu (Chat nhiều người), hãy làm như sau:

1. **Chạy Server**: Chạy file `ChatServer.java`.
2. **Chạy Client 1**: Chạy file `ChatClient.java`, nhập tên là "Tùng".
3. **Chạy Client 2**: Mở thêm một Terminal khác, chạy `ChatClient.java`, nhập tên là "Cúc".
4. **Chạy Client 3**: Mở thêm Terminal nữa, chạy `ChatClient.java`, nhập tên là "Trúc".

Bây giờ khi "Tùng" nhắn **"Hello mọi người"**, cả "Cúc" và "Trúc" đều sẽ nhận được tin nhắn ngay lập tức. "Cúc" có thể trả lời trong khi "Trúc" đang gõ phím mà không ai bị chặn cả.

## 5. Lời kết

Việc xây dựng một ứng dụng Chat đa luồng là bước nhảy vọt quan trọng trong hành trình học lập trình mạng. Bạn đã học được:

- **Multi-threading**: Cách tạo và quản lý nhiều luồng chạy song song.
- **Broadcast Pattern**: Cách gửi tin nhắn tới nhiều người cùng lúc.
- **Non-blocking I/O concept**: Tách việc đọc và ghi để giao diện không bị "đơ".
- **Real-time Communication**: Nguyên lý cơ bản đằng sau các ứng dụng chat hiện đại.

Từ đây, bạn có thể mở rộng thêm nhiều tính năng thú vị:

- **Private Message**: Tin nhắn riêng giữa 2 người.
- **Chat Rooms**: Tạo nhiều phòng chat khác nhau.
- **File Transfer**: Gửi file qua lại.
- **Encryption**: Mã hóa tin nhắn để bảo mật.
- **GUI Interface**: Xây dựng giao diện đồ họa với JavaFX hoặc Swing.

Hãy thử thách bản thân bằng cách implement những tính năng này! Networking không khó, chỉ cần luyện tập đủ nhiều, bạn sẽ thành thạo.

Happy coding!
