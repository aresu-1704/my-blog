+++
title = "Từ Blocking I/O đến Non-blocking I/O: Java NIO thay đổi cách Server xử lý mạng như thế nào?"
date = 2025-12-22T01:30:00+07:00
draft = false
categories = ["Java", "Backend", "System Design"]
tags = ["Java", "NIO", "I/O", "Concurrency", "Server", "Network Programming", "Performance"]
series = ["Network Programming"]
difficulty = "advanced"
description = "Phân tích sâu về sự chuyển đổi từ blocking I/O sang non-blocking I/O trong Java. Hiểu rõ Java NIO, Selector, Multiplexing và cách chúng thay đổi kiến trúc server hiện đại"
image = "images/java-nio.jpg"
+++

## Khi một thread chỉ phục vụ một kết nối

Mô hình server Java đơn giản nhất hoạt động theo kiểu thread-per-connection: mỗi khi có client kết nối, server tạo một thread mới để xử lý. ServerSocket chấp nhận kết nối, khởi tạo thread mới, thread đó đọc request, xử lý business logic, gửi response, rồi kết thúc. Cách tiếp cận này có logic rõ ràng và code dễ hiểu, không phức tạp.

Vấn đề chỉ bộc lộ khi số lượng concurrent connections tăng lên. Với mô hình blocking I/O truyền thống, mỗi khi thread gọi `socket.read()` hoặc `socket.write()`, nó bị chặn cho đến khi thao tác hoàn thành. Nếu client chậm, network bị tắc nghẽn, hoặc đơn giản là client đang chờ đợi, thread ở server phải ngồi chờ. Không làm gì cả, chỉ chờ. CPU không tốn nhiều, nhưng thread thì chiếm memory và system resources.

Khi có mười, hai mươi concurrent connections thì vẫn chấp nhận được. Nhưng khi lên hàng trăm, hàng nghìn connections, việc tạo ra cùng số lượng threads bắt đầu thành vấn đề nghiêm trọng. Mỗi thread trong Java chiếm khoảng 1MB stack memory mặc định. Một nghìn threads nghĩa là 1GB RAM chỉ cho stacks, chưa kể heap memory và các overhead khác. Tệ hơn là context switching giữa hàng nghìn threads làm CPU bị quá tải, performance sụt giảm thảm hại thay vì tăng.

Trường hợp thực tế điển hình là một server xử lý WebSocket connections. Ban đầu kiểm tra với vài trăm clients thì mọi thứ hoạt động ổn định. Tuy nhiên khi lên production với vài nghìn concurrent users, server bắt đầu lag, response time tăng vọt, cuối cùng crash với OutOfMemoryError. Monitoring cho thấy số lượng threads vượt quá mười nghìn. JVM không thể tạo thêm threads nữa. Đây là bằng chứng rõ ràng cho thấy mô hình thread-per-connection không thể mở rộng được.

## Vấn đề không phải ở thread, mà ở blocking

Điều khiến mô hình truyền thống không hiệu quả không phải là việc dùng threads, mà là việc threads bị chặn vô nghĩa. Trong phần lớn thời gian, một      connection đang chờ data từ network. Client gửi HTTP request, nhưng dữ liệu đến server qua network không phải tức thì. Nó đi qua routers, switches, có thể bị trì hoãn vì giới hạn băng thông hoặc tắc nghẽn mạng. Ở phía server, thread gọi `inputStream.read()` và bị chặn cho đến khi có đủ dữ liệu.

Trong thời gian chờ đợi này, thread không làm gì hữu ích. Nó không tiêu thụ CPU, nhưng nó vẫn tồn tại, chiếm memory, và là một entry trong bảng thread của JVM. OS scheduler vẫn phải xem xét nó khi lập lịch. Nếu có một nghìn threads đang bị chặn chờ I/O, đó là một nghìn threads không làm việc nhưng vẫn tốn tài nguyên.

Giải pháp cần thiết không phải là một thread cho mỗi connection. Điều cần thiết là khả năng để một thread xử lý nhiều connections. Nhưng làm sao để một thread biết connection nào đang có data sẵn sàng để đọc mà không bị chặn khi kiểm tra từng connection một? Đó là lúc Java NIO xuất hiện.

## Java NIO và ý tưởng non-blocking I/O

Java NIO (New I/O, hoặc Non-blocking I/O) ra đời trong Java 1.4 với một tư duy hoàn toàn khác. Thay vì thread bị chặn khi chờ I/O, NIO cho phép thread kiểm tra xem thao tác I/O có thể thực hiện được không trước khi thực sự làm. Nếu chưa sẵn sàng, thread không cần chờ, nó có thể làm việc khác hoặc kiểm tra connection khác.

Cốt lõi của NIO là ba khái niệm: Channels, Buffers và Selectors. Channel trong NIO giống như socket trong blocking I/O, nhưng nó có thể được cấu hình thành chế độ non-blocking. Buffer là vùng nhớ để đọc/ghi dữ liệu. Nhưng component quan trọng nhất là Selector.

Selector cho phép một thread duy nhất giám sát nhiều channels cùng lúc. Các channels được đăng ký với Selector, chỉ định các thao tác cần quan sát (read, write, accept, connect). Khi gọi `selector.select()`, method này sẽ chặn cho đến khi ít nhất một channel sẵn sàng cho thao tác đã đăng ký. Quan trọng là nó chỉ trả về khi có event xảy ra, không phải kiểm tra polling liên tục.

Điều này tạo ra một sự thay đổi hoàn toàn về mặt tư duy. Thay vì thread chờ từng connection, một thread có thể chờ bất kỳ connection nào trong nhóm sẵn sàng. Khi có connection sẵn sàng, thread xử lý nó, rồi quay lại chờ tiếp. Một thread có thể xử lý hàng nghìn connections mà không cần tạo ra hàng nghìn threads.

## Multiplexing ở tầng OS

Để hiểu tại sao Selector hiệu quả, cần nhìn xuống tầng OS. Trên Linux, NIO Selector sử dụng epoll (hoặc select/poll trên các hệ thống cũ hơn). Trên Windows, nó dùng I/O Completion Ports. Đây là các system calls cho phép ứng dụng giám sát nhiều file descriptors (sockets) cùng lúc.

Epoll hoạt động rất hiệu quả. Thay vì kernel phải quét qua tất cả file descriptors mỗi lần kiểm tra (như select/poll làm), epoll duy trì một danh sách event. Khi có I/O event xảy ra, kernel thêm file descriptor vào danh sách sẵn sàng. Ứng dụng chỉ cần kiểm tra danh sách sẵn sàng này, không cần quét hết tất cả descriptors. Độ phức tạp là O(1) cho số lượng events sẵn sàng, không phải O(n) cho tổng số connections.

Điều này có nghĩa là server có thể duy trì hàng chục nghìn connections với overhead tối thiểu. Kernel sẽ thông báo cho ứng dụng chỉ khi có connections thực sự có events. Ứng dụng không lãng phí CPU cycles kiểm tra connections không có gì mới.

## Code pattern của NIO server

Triển khai một NIO server khác khá nhiều so với blocking I/O server. Thay vì vòng lặp accept-spawn-thread, NIO server có một event loop chính. Thread này chạy vòng lặp vô hạn, gọi `selector.select()` để chờ events, rồi xử lý từng event khi chúng đến.

```java
Selector selector = Selector.open();
ServerSocketChannel serverChannel = ServerSocketChannel.open();
serverChannel.configureBlocking(false);
serverChannel.bind(new InetSocketAddress(8080));
serverChannel.register(selector, SelectionKey.OP_ACCEPT);

while (true) {
    selector.select(); // Block cho đến khi có events

    Set<SelectionKey> selectedKeys = selector.selectedKeys();
    Iterator<SelectionKey> iterator = selectedKeys.iterator();

    while (iterator.hasNext()) {
        SelectionKey key = iterator.next();
        iterator.remove();

        if (key.isAcceptable()) {
            // Client mới kết nối
            ServerSocketChannel server = (ServerSocketChannel) key.channel();
            SocketChannel client = server.accept();
            client.configureBlocking(false);
            client.register(selector, SelectionKey.OP_READ);
        }

        if (key.isReadable()) {
            // Client có data để đọc
            SocketChannel client = (SocketChannel) key.channel();
            ByteBuffer buffer = ByteBuffer.allocate(1024);
            int bytesRead = client.read(buffer);

            if (bytesRead == -1) {
                client.close();
            } else {
                // Xử lý data
                buffer.flip();
                // ... business logic ...
                key.interestOps(SelectionKey.OP_WRITE);
            }
        }

        if (key.isWritable()) {
            // Client sẵn sàng để nhận response
            SocketChannel client = (SocketChannel) key.channel();
            ByteBuffer response = getResponseBuffer(key);
            client.write(response);

            if (!response.hasRemaining()) {
                key.interestOps(SelectionKey.OP_READ);
            }
        }
    }
}
```

Code này trông khác lạ đối với người quen với blocking I/O. Không có threads riêng cho mỗi connection. Không có blocking reads/writes. Thay vào đó, toàn bộ logic được tổ chức theo events. Khi có event, xử lý event đó, rồi quay lại chờ event tiếp theo.

Cái giá phải trả là độ phức tạp. Blocking I/O code dễ đọc, dễ debug, flow tuyến tính. NIO code phức tạp hơn nhiều. Logic bị phân mảnh theo các event handlers khác nhau. Quản lý state trở nên khó khăn vì không có thread riêng duy trì state cho mỗi connection. State phải được gắn vào SelectionKey hoặc duy trì trong external map.

## Event-driven architecture và callback hell

Mô hình NIO về bản chất là event-driven. Thay vì imperative "đọc request, xử lý, gửi response" theo tuần tự, NIO làm việc theo reactive pattern "khi có event X, làm Y". Điều này khá giống với JavaScript event loop trong Node.js hoặc browser.

Trong JavaScript, các event handlers được đăng ký cho các events khác nhau. Click event, timer callback, AJAX response. Browser's event loop liên tục kiểm tra events và thực thi các handlers tương ứng. NIO Selector hoạt động tương tự, nhưng ở Java và với network I/O events.

Pattern này mạnh mẽ nhưng cũng có những cạm bẫy. Khi logic phức tạp, có thể rơi vào "callback hell" - các callbacks lồng nhau khó duy trì. Trong NIO, nếu thao tác yêu cầu nhiều lượt tương tác (gửi request, chờ response, xử lý, gửi follow-up), code có thể trở nên rối rắm. State phải được theo dõi thủ công cho mỗi giai đoạn của thao tác.

Để giải quyết, nhiều frameworks xây dựng các lớp trừu tượng lên trên NIO. Netty, Java's built-in AsynchronousSocketChannel, reactive libraries như Project Reactor hay RxJava. Chúng cung cấp các APIs cấp cao hơn để làm việc với async I/O mà không cần xử lý trực tiếp với low-level Selector và SelectionKeys.

## Khả năng mở rộng và sử dụng tài nguyên

Lợi ích lớn nhất của NIO là khả năng mở rộng. Với blocking I/O và thread-per-connection, server bị giới hạn bởi số lượng threads có thể tạo ra. Hầu hết JVMs đạt giới hạn ở vài nghìn threads trước khi performance giảm nghiêm trọng hoặc OutOfMemoryError.

Với NIO, giới hạn không phải threads mà là file descriptors. Trên Linux, mỗi process có giới hạn số file descriptors có thể mở (thường cấu hình qua ulimit). Giới hạn này có thể tăng lên hàng chục hoặc hàng trăm nghìn. Một NIO server với một hoặc vài threads có thể xử lý hàng chục nghìn concurrent connections.

Trong thực tế, một server WebSocket được refactor từ blocking I/O sang NIO đã cho thấy sự cải thiện đáng kể. Trước khi refactor, server với 4GB RAM chỉ chịu được khoảng 3000 concurrent connections. Sau khi refactor sử dụng NIO, cùng 4GB RAM, server xử lý được 50,000 connections. Memory usage chủ yếu là buffers cho dữ liệu và connection metadata, không phải thread stacks. CPU usage thấp hơn vì ít context switching.

Tất nhiên, để đạt được hiệu suất này cần điều chỉnh cẩn thận. Kích thước buffers, số lượng selector threads, chiến lược xử lý business logic. Nếu business logic nặng và chạy trong selector thread, nó sẽ chặn event loop và làm giảm throughput. Thực hành tốt nhất là selector thread chỉ xử lý I/O, giao business logic cho worker thread pool.

## NIO trong các frameworks hiện đại

Hầu hết các framework và application servers Java hiện đại đều sử dụng NIO bên dưới. Netty là một NIO framework phổ biến nhất, được dùng bởi vô số projects: Elasticsearch, Cassandra, gRPC Java implementation, Play Framework, và nhiều nữa. Netty trừu tượng hóa độ phức tạp của NIO, cung cấp event-driven API dễ dùng hơn, và tối ưu hiệu suất đến mức cực kỳ cao.

Apache Tomcat từ version 8.5 dùng NIO connector mặc định. Jetty cũng vậy. Spring WebFlux, reactive web framework của Spring, được xây dựng trên Project Reactor và hỗ trợ các NIO-based servers như Netty hoặc Undertow. Tất cả nhằm đạt được non-blocking I/O cho khả năng mở rộng tốt hơn.

Node.js, thường được so sánh với Java về hiệu suất, cũng sử dụng event loop tương tự. Libuv, library mà Node.js dựa vào, dùng epoll/kqueue/IOCP tùy platform, giống như Java NIO Selector. Tư duy là giống nhau: một hoặc vài threads giám sát nhiều connections, xử lý events khi chúng đến.

Ngay cả khi không trực tiếp lập trình với NIO, hiểu về nó giúp đánh giá cao các frameworks đang sử dụng. Khi cấu hình Netty hoặc điều chỉnh Tomcat NIO connector, biết cách chúng hoạt động bên dưới giúp đưa ra quyết định sáng suốt về kích thước thread pool, cấu hình buffers, backlog settings.

## Đánh đổi và khi nào nên dùng

NIO không phải là giải pháp hoàn hảo cho mọi vấn đề. Nó tốt cho các ứng dụng I/O-bound với nhiều concurrent connections nhưng mỗi request không đòi hỏi nhiều tính toán. Ví dụ điển hình là proxy servers, API gateways, WebSocket servers, chat applications. Những use cases này phần lớn thời gian là chờ I/O, ít công việc tính toán nặng.

Nếu ứng dụng là CPU-bound, ví dụ xử lý ảnh hoặc tính toán phức tạp, NIO không giúp được nhiều. Vấn đề không phải chờ I/O mà là thời gian tính toán. Khi đó, thread pool với blocking I/O hoặc parallel processing frameworks như Fork/Join có thể phù hợp hơn.

NIO cũng khó debug và test hơn. Race conditions, lỗi quản lý state trong event-driven code nổi tiếng khó xử lý. Blocking I/O code với one thread per request dễ suy luận về hành vi. Mỗi request có execution path riêng, dễ theo dõi. NIO code nhiều requests chia sẻ threads, khó theo dõi những gì đang xảy ra.

Thời gian phát triển cũng là một vấn đề cần xem xét. Viết NIO code từ đầu tốn nhiều thời gian hơn blocking I/O. Phải xử lý buffers, partial reads/writes, quản lý state. Nếu yêu cầu mở rộng không cao, sự đơn giản của blocking I/O có thể là sự đánh đổi đáng giá.

## Từ NIO đến NIO.2 và tương lai

Java 7 giới thiệu NIO.2 (hay còn gọi là AIO - Asynchronous I/O) với AsynchronousSocketChannel và AsynchronousServerSocketChannel. Khác với cách tiếp cận selector-based của NIO, NIO.2 dùng callback hoặc Future-based API. Thao tác I/O được khởi tạo và callback sẽ được gọi khi thao tác hoàn thành.

NIO.2 có mức độ trừu tượng cao hơn NIO, dễ sử dụng hơn trong một số trường hợp. Nhưng nó không thay thế hoàn toàn NIO. Netty vẫn dùng NIO selector approach vì hiệu suất và khả năng kiểm soát. NIO.2 có thể tiện lợi nhưng đôi khi overhead cao hơn.

Tương lai của Java I/O đang hướng tới Project Loom. Loom giới thiệu virtual threads (fibers), các lightweight threads được quản lý bởi JVM thay vì OS. Với virtual threads, code có thể viết theo blocking style nhưng bên dưới runtime lập lịch virtual threads hiệu quả, không tạo OS threads cho mỗi connection. Ý tưởng là sự đơn giản của thread-per-request với khả năng mở rộng của NIO.

Khi Loom ổn định và được áp dụng rộng rãi, có thể sẽ có sự chuyển dịch trở lại về blocking-style code nhưng với runtime khác. Cho đến lúc đó, NIO vẫn là nền tảng của các high-performance Java servers.

## Kết luận

Java NIO không chỉ là một API mới, mà là một sự thay đổi hoàn toàn tư duy trong cách thiết kế ứng dụng server. Nó buộc developers phải nghĩ về I/O theo mô hình event-driven thay vì mô hình blocking tuần tự. Sự đánh đổi là độ phức tạp tăng, nhưng phần thưởng là khả năng mở rộng lên hàng bậc về số concurrent connections.

Hiểu NIO giúp đánh giá cao các frameworks hiện đại. Netty, Spring WebFlux, reactive programming - tất cả đều được xây dựng trên nền tảng này. Ngay cả khi không lập trình trực tiếp với Selector và Channels, các concepts của non-blocking I/O, event loops, multiplexing vẫn liên quan cho system design.

Blocking I/O vẫn có chỗ đứng cho các ứng dụng đơn giản, yêu cầu concurrency thấp. Nhưng khi mở rộng là mục tiêu, khi số concurrent connections lên hàng nghìn hoặc hàng chục nghìn, NIO là câu trả lời. Đó không phải chỉ là kỹ thuật tối ưu, mà là tư duy khác về cách server tương tác với network.

---

**Tham khảo:**

- "Java NIO" - Ron Hitchens
- "Netty in Action" - Norman Maurer & Marvin Allen Wolfthal
- Java NIO Documentation - Oracle
- "Scalable I/O in Java" - Doug Lea
