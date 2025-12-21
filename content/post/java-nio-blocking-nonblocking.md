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

Hồi mới bắt đầu viết server Java, mình làm theo mô hình đơn giản nhất: mỗi khi có client kết nối, tạo một thread mới để xử lý. ServerSocket accept connection, spawn một thread, thread đó đọc request, xử lý business logic, gửi response, rồi kết thúc. Nghe logic và dễ hiểu. Code cũng straightforward, không phức tạp gì.

Vấn đề chỉ bộc lộ khi số lượng concurrent connections tăng lên. Với mô hình blocking I/O truyền thống, mỗi khi thread gọi `socket.read()` hoặc `socket.write()`, nó bị block cho đến khi operation hoàn thành. Nếu client chậm, network congested, hoặc đơn giản là client đang suy nghĩ, thread ở server cứ ngồi đó chờ. Không làm gì cả, chỉ chờ. CPU không tốn nhiều, nhưng thread thì chiếm memory và system resources.

Khi có mười, hai mươi concurrent connections thì vẫn OK. Nhưng khi lên hàng trăm, hàng nghìn connections, việc tạo ra cùng số lượng threads bắt đầu thành vấn đề nghiêm trọng. Mỗi thread trong Java chiếm khoảng 1MB stack memory mặc định. Một nghìn threads nghĩa là 1GB RAM chỉ cho stacks, chưa kể heap memory và các overhead khác. Worse hơn là context switching giữa hàng nghìn threads làm CPU thrashing, performance sụt giảm thảm hại thay vì tăng.

Mình từng deploy một server nhỏ xử lý WebSocket connections. Ban đầu test với vài trăm clients thì mọi thứ ổn. Nhưng khi lên production với vài nghìn concurrent users, server bắt đầu lag, response time tăng vọt, rồi cuối cùng crash với OutOfMemoryError. Monitoring cho thấy số lượng threads vượt quá mười nghìn. JVM không thể tạo thêm threads nữa. Đó là lúc mình nhận ra mô hình thread-per-connection không scale.

## Vấn đề không phải ở thread, mà ở blocking

Cái khiến mô hình truyền thống không hiệu quả không phải là việc dùng threads, mà là việc threads bị block vô nghĩa. Hãy nghĩ về điều này: trong phần lớn thời gian, một connection đang chờ data từ network. Client gửi HTTP request, nhưng dữ liệu đến server qua network không phải tức thì. Nó đi qua routers, switches, có thể bị delay vì bandwidth limitation hoặc network congestion. ở phía server, thread gọi `inputStream.read()` và bị block cho đến khi có đủ data.

Trong thời gian chờ đợi này, thread không làm gì hữu ích. Nó không consume CPU, nhưng nó vẫn tồn tại, chiếm memory, và là một entry trong JVM's thread table. OS scheduler vẫn phải consider nó khi scheduling. Nếu có một nghìn threads đang block chờ I/O, đó là một nghìn threads không productive nhưng vẫn tốn resources.

Điều mình cần không phải là một thread cho mỗi connection. Điều mình cần là khả năng để một thread xử lý nhiều connections. Nhưng làm sao để một thread biết connection nào đang có data ready để đọc mà không bị block checking từng connection một? Đó là lúc Java NIO xuất hiện.

## Java NIO và ý tưởng non-blocking I/O

Java NIO (New I/O, hoặc Non-blocking I/O) ra đời trong Java 1.4 với một mindset hoàn toàn khác. Thay vì thread block khi chờ I/O, NIO cho phép thread check xem I/O operation có thể thực hiện được không trước khi thực sự làm. Nếu không ready, thread không cần wait, nó có thể làm việc khác hoặc check connection khác.

Cốt lõi của NIO là ba khái niệm: Channels, Buffers và Selectors. Channel trong NIO giống như socket trong blocking I/O, nhưng nó có thể configure thành non-blocking mode. Buffer là vùng nhớ để đọc/ghi data. Nhưng component quan trọng nhất là Selector.

Selector cho phép một thread duy nhất monitor nhiều channels cùng lúc. Bạn register các channels với Selector, chỉ định operations bạn quan tâm (read, write, accept, connect). Khi gọi `selector.select()`, method này sẽ block cho đến khi ít nhất một channel ready cho operation đã register. Quan trọng là nó chỉ trả về khi có event xảy ra, không phải check polling liên tục.

Điều này tạo ra một paradigm shift hoàn toàn. Thay vì thread chờ từng connection, giờ một thread có thể chờ bất kỳ connection nào trong nhóm ready. Khi có connection ready, thread xử lý nó, rồi quay lại chờ tiếp. Một thread có thể handle hàng nghìn connections mà không cần tạo ra hàng nghìn threads.

## Multiplexing ở tầng OS

Để hiểu tại sao Selector hiệu quả, cần nhìn xuống OS level. Trên Linux, NIO Selector sử dụng epoll (hoặc select/poll trên các systems cũ hơn). Trên Windows, nó dùng I/O Completion Ports. Đây là các system calls cho phép application monitor nhiều file descriptors (sockets) cùng lúc.

Epoll hoạt động rất hiệu quả. Thay vì kernel phải scan qua tất cả file descriptors mỗi lần check (như select/poll làm), epoll maintain một event list. Khi có I/O event xảy ra, kernel add file descriptor vào ready list. Application chỉ cần check ready list này, không cần scan hết tất cả descriptors. Complexity là O(1) cho số lượng ready events, không phải O(n) cho tổng số connections.

Điều này có nghĩa là server có thể maintain hàng chục nghìn connections mà overhead minimal. Kernel sẽ notify application chỉ khi có connections thực sự có events. Application không waste CPU cycles checking connections không có gì mới.

## Code pattern của NIO server

Triển khai một NIO server khác khá nhiều so với blocking I/O server. Thay vì vòng lặp accept-spawn-thread, NIO server có một event loop chính. Thread này chạy vòng lặp vô hạn, gọi `selector.select()` để chờ events, rồi process từng event khi chúng arrive.

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
            // Client ready để nhận response
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

Code này trông khác lạ nếu bạn quen với blocking I/O. Không có threads riêng cho mỗi connection. Không có blocking reads/writes. Thay vào đó, toàn bộ logic được organize theo events. Khi có event, xử lý event đó, rồi quay lại chờ event tiếp theo.

Cái giá phải trả là complexity. Blocking I/O code dễ đọc, dễ debug, flow tuyến tính. NIO code phức tạp hơn nhiều. Logic phân mảnh theo các event handlers khác nhau. State management trở nên tricky vì không có thread riêng duy trì state cho mỗi connection. Bạn phải attach state vào SelectionKey hoặc maintain external map.

## Event-driven architecture và callback hell

Mô hình NIO về bản chất là event-driven. Thay vì imperative "đọc request, xử lý, gửi response" theo sequence, NIO làm việc theo reactive pattern "khi có event X, làm Y". Điều này khá giống với JavaScript event loop trong Node.js hoặc browser.

Trong JavaScript, bạn register event handlers cho các events khác nhau. Click event, timer callback, AJAX response. Browser's event loop continuously check for events và execute corresponding handlers. NIO Selector hoạt động tương tự, nhưng ở Java và với network I/O events.

Pattern này powerful nhưng cũng có những pitfalls. Khi logic phức tạp, bạn có thể rơi vào "callback hell" - nested callbacks khó maintain. Trong NIO, nếu operation yêu cầu multiple round-trips (send request, wait response, process, send follow-up), code có thể trở nên convoluted. Bạn phải manually track state cho mỗi stage của operation.

Để giải quyết, nhiều frameworks build abstraction layers lên trên NIO. Netty, Java's built-in AsynchronousSocketChannel, reactive libraries như Project Reactor hay RxJava. Chúng provide higher-level APIs để work với async I/O mà không cần deal trực tiếp với low-level Selector và SelectionKeys.

## Scalability và resource utilization

Benefit lớn nhất của NIO là scalability. Với blocking I/O và thread-per-connection, server limited bởi số lượng threads có thể tạo ra. Hầu hết JVMs cap ở vài nghìn threads trước khi performance degradation nghiêm trọng hoặc OutOfMemoryError.

Với NIO, giới hạn không phải threads mà là file descriptors. Trên Linux, mỗi process có limit số file descriptors có thể open (thường configure qua ulimit). Limit này có thể tăng lên hàng chục hoặc hàng trăm nghìn. Một NIO server với một hoặc vài threads có thể handle tens of thousands of concurrent connections.

Mình từng refactor server WebSocket từ blocking I/O sang NIO. Before refactor, server với 4GB RAM max out ở khoảng 3000 concurrent connections. After refactor sử dụng NIO, cùng 4GB RAM, server handle được 50,000 connections. Memory usage chủ yếu là buffers cho data và connection metadata, không phải thread stacks. CPU usage thấp hơn vì ít context switching.

Tất nhiên, để đạt được performance này cần tune cẩn thận. Buffer sizes, selector threads count, business logic processing strategy. Nếu business logic heavy và chạy trong selector thread, nó sẽ block event loop và làm giảm throughput. Best practice là selector thread chỉ handle I/O, delegate business logic cho worker thread pool.

## NIO trong các frameworks hiện đại

Hầu hết các framework và application servers Java hiện đại đều sử dụng NIO underneath. Netty là một NIO framework phổ biến nhất, được dùng bởi vô số projects: Elasticsearch, Cassandra, gRPC Java implementation, Play Framework, và nhiều nữa. Netty abstract complexity của NIO, provide event-driven API dễ dùng hơn, và optimize performance đến mức extreme.

Apache Tomcat từ version 8.5 dùng NIO connector mặc định. Jetty cũng vậy. Spring WebFlux, reactive web framework của Spring, build trên Project Reactor và support NIO-based servers như Netty hoặc Undertow. Tất cả nhằm achieve non-blocking I/O cho better scalability.

Node.js mà nhiều người so sánh với Java về performance cũng sử dụng event loop tương tự. Libuv, library mà Node.js dựa vào, dùng epoll/kqueue/IOCP tùy platform, giống như Java NIO Selector. Mindset là giống nhau: một hoặc vài threads monitor nhiều connections, process events as they arrive.

Ngay cả khi không directly code với NIO, hiểu về nó giúp bạn appreciate các frameworks đang dùng. Khi config Netty hoặc tune Tomcat NIO connector, biết cách chúng hoạt động underneath giúp bạn make informed decisions về thread pool sizes, buffer configurations, backlog settings.

## Trade-offs và khi nào nên dùng

NIO không phải silver bullet. Nó tốt cho I/O-bound applications với nhiều concurrent connections nhưng mỗi request không đòi hỏi nhiều computing. Ví dụ điển hình là proxy servers, API gateways, WebSocket servers, chat applications. Những use cases này phần lớn thời gian là wait for I/O, ít CPU-intensive work.

Nếu application của bạn CPU-bound, ví dụ image processing hoặc complex calculations, NIO không giúp được nhiều. Vấn đề không phải I/O wait mà là computation time. Khi đó, thread pool với blocking I/O hoặc parallel processing frameworks như Fork/Join có thể phù hợp hơn.

NIO cũng khó debug và test hơn. Race conditions, state management bugs trong event-driven code notoriously tricky. Blocking I/O code với one thread per request dễ reason về behavior. Mỗi request có execution path riêng, dễ trace. NIO code nhiều requests share threads, harder to track what's happening.

Development time cũng là concern. Viết NIO code from scratch tốn nhiều thời gian hơn blocking I/O. Phải handle buffers, partial reads/writes, state management. Nếu scale requirements không cao, simplicity của blocking I/O có thể worthwhile trade-off.

## Từ NIO đến NIO.2 và tương lai

Java 7 introduced NIO.2 (hay còn gọi là AIO - Asynchronous I/O) với AsynchronousSocketChannel và AsynchronousServerSocketChannel. Khác với NIO's selector-based approach, NIO.2 dùng callback hoặc Future-based API. Bạn initiate I/O operation và provide callback sẽ được gọi khi operation completes.

NIO.2 abstraction level cao hơn NIO, easier to use trong một số cases. Nhưng nó không replace NIO hoàn toàn. Netty vẫn dùng NIO selector approach vì performance và control. NIO.2 có thể convenient nhưng đôi khi overhead higher.

Tương lai của Java I/O đang hướng tới Project Loom. Loom introduce virtual threads (fibers), lightweight threads managed bởi JVM thay vì OS. Với virtual threads, bạn có thể viết code theo blocking style nhưng underneath runtime schedule virtual threads efficiently, không tạo OS threads cho mỗi connection. IDE là thread-per-request simplicity với NIO-level scalability.

Khi Loom stable và widely adopted, có thể sẽ shift lại về blocking-style code nhưng với different runtime. Cho đến lúc đó, NIO vẫn là foundation của high-performance Java servers.

## Kết luận

Java NIO không chỉ là một API mới, mà là một paradigm shift trong cách design server applications. Nó force developers nghĩ về I/O theo event-driven model thay vì sequential blocking model. Trade-off là complexity tăng, nhưng reward là khả năng scale lên orders of magnitude về số concurrent connections.

Hiểu NIO giúp bạn appreciate các frameworks modern đang dùng. Netty, Spring WebFlux, reactive programming - tất cả build trên nền tảng này. Ngay cả khi không code trực tiếp với Selector và Channels, concepts của non-blocking I/O, event loops, multiplexing vẫn relevant cho system design.

Blocking I/O vẫn có chỗ đứng cho applications đơn giản, low concurrency requirements. Nhưng khi scale là mục tiêu, khi số concurrent connections lên hàng nghìn hoặc tens of thousands, NIO là answer. Đó không phải chỉ là optimization technique, mà là mindset khác về cách server interact với network.

---

**Tham khảo:**

- "Java NIO" - Ron Hitchens
- "Netty in Action" - Norman Maurer & Marvin Allen Wolfthal
- Java NIO Documentation - Oracle
- "Scalable I/O in Java" - Doug Lea

