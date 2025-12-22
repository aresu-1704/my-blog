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

Mô hình server Java đơn giản nhất hoạt động theo kiểu một thread cho một kết nối: mỗi khi có client kết nối, server tạo một thread mới để xử lý. ServerSocket chấp nhận kết nối, khởi tạo thread mới, thread đó đọc yêu cầu, xử lý logic nghiệp vụ, gửi kết quả trả về, rồi kết thúc. Cách tiếp cận này có logic rõ ràng và code dễ hiểu, không phức tạp.

Vấn đề chỉ bộc lộ khi số lượng kết nối đồng thời tăng lên. Với mô hình blocking I/O truyền thống, mỗi khi thread gọi `socket.read()` hoặc `socket.write()`, nó bị chặn cho đến khi thao tác hoàn thành. Nếu client chậm, mạng bị tắc nghẽn, hoặc đơn giản là client đang chờ đợi, thread ở server phải ngồi chờ. Không làm gì cả, chỉ chờ. CPU không tốn nhiều, nhưng thread thì chiếm bộ nhớ và tài nguyên hệ thống.

Khi có mười, hai mươi kết nối đồng thời thì vẫn chấp nhận được. Nhưng khi lên hàng trăm, hàng nghìn kết nối, việc tạo ra cùng số lượng threads bắt đầu thành vấn đề nghiêm trọng. Mỗi thread trong Java chiếm khoảng 1MB bộ nhớ stack mặc định. Một nghìn threads nghĩa là 1GB RAM chỉ cho stack, chưa kể bộ nhớ heap và các chi phí phụ khác. Tệ hơn là việc chuyển ngữ cảnh giữa hàng nghìn threads làm CPU bị quá tải, hiệu năng sụt giảm thảm hại thay vì tăng.

Trường hợp thực tế điển hình là một server xử lý các kết nối WebSocket. Ban đầu kiểm tra với vài trăm clients thì mọi thứ hoạt động ổn định. Tuy nhiên khi triển khai thật với vài nghìn người dùng đồng thời, server bắt đầu chậm, thời gian phản hồi tăng vọt, cuối cùng sập với lỗi OutOfMemoryError. Hệ thống giám sát cho thấy số lượng threads vượt quá mười nghìn. JVM không thể tạo thêm threads nữa. Đây là bằng chứng rõ ràng cho thấy mô hình một thread cho một kết nối không thể mở rộng được.

## Vấn đề không phải ở thread, mà ở blocking

Điều khiến mô hình truyền thống không hiệu quả không phải là việc dùng threads, mà là việc threads bị chặn vô nghĩa. Trong phần lớn thời gian, một kết nối đang chờ dữ liệu từ mạng. Client gửi yêu cầu HTTP, nhưng dữ liệu đến server qua mạng không phải tức thì. Nó đi qua routers, switches, có thể bị trì hoãn vì giới hạn băng thông hoặc tắc nghẽn mạng. Ở phía server, thread gọi `inputStream.read()` và bị chặn cho đến khi có đủ dữ liệu.

Trong thời gian chờ đợi này, thread không làm gì hữu ích. Nó không tiêu thụ CPU, nhưng nó vẫn tồn tại, chiếm bộ nhớ, và là một mục trong bảng thread của JVM. Bộ lập lịch của hệ điều hành vẫn phải xem xét nó khi lập lịch. Nếu có một nghìn threads đang bị chặn chờ I/O, đó là một nghìn threads không làm việc nhưng vẫn tốn tài nguyên.

Giải pháp cần thiết không phải là một thread cho mỗi kết nối. Điều cần thiết là khả năng để một thread xử lý nhiều kết nối. Nhưng làm sao để một thread biết kết nối nào đang có dữ liệu sẵn sàng để đọc mà không bị chặn khi kiểm tra từng kết nối một? Đó là lúc Java NIO xuất hiện.

## Java NIO và ý tưởng non-blocking I/O

Java NIO (New I/O, hoặc Non-blocking I/O) ra đời trong Java 1.4 với một tư duy hoàn toàn khác. Thay vì thread bị chặn khi chờ I/O, NIO cho phép thread kiểm tra xem thao tác I/O có thể thực hiện được không trước khi thực sự làm. Nếu chưa sẵn sàng, thread không cần chờ, nó có thể làm việc khác hoặc kiểm tra kết nối khác.

Cốt lõi của NIO là ba khái niệm: Channels, Buffers và Selectors. Channel trong NIO giống như socket trong blocking I/O, nhưng nó có thể được cấu hình thành chế độ không chặn. Buffer là vùng nhớ để đọc/ghi dữ liệu. Nhưng thành phần quan trọng nhất là Selector.

Selector cho phép một thread duy nhất giám sát nhiều channels cùng lúc. Các channels được đăng ký với Selector, chỉ định các thao tác cần quan sát (đọc, ghi, chấp nhận kết nối, kết nối). Khi gọi `selector.select()`, phương thức này sẽ chặn cho đến khi ít nhất một channel sẵn sàng cho thao tác đã đăng ký. Quan trọng là nó chỉ trả về khi có sự kiện xảy ra, không phải kiểm tra thăm dò liên tục.

Điều này tạo ra một sự thay đổi hoàn toàn về mặt tư duy. Thay vì thread chờ từng kết nối, một thread có thể chờ bất kỳ kết nối nào trong nhóm sẵn sàng. Khi có kết nối sẵn sàng, thread xử lý nó, rồi quay lại chờ tiếp. Một thread có thể xử lý hàng nghìn kết nối mà không cần tạo ra hàng nghìn threads.

## Ghép kênh ở tầng hệ điều hành

Để hiểu tại sao Selector hiệu quả, cần nhìn xuống tầng hệ điều hành. Trên Linux, NIO Selector sử dụng epoll (hoặc select/poll trên các hệ thống cũ hơn). Trên Windows, nó dùng I/O Completion Ports. Đây là các lệnh gọi hệ thống cho phép ứng dụng giám sát nhiều mô tả tệp (sockets) cùng lúc.

Epoll hoạt động rất hiệu quả. Thay vì kernel phải quét qua tất cả mô tả tệp mỗi lần kiểm tra (như select/poll làm), epoll duy trì một danh sách sự kiện. Khi có sự kiện I/O xảy ra, kernel thêm mô tả tệp vào danh sách sẵn sàng. Ứng dụng chỉ cần kiểm tra danh sách sẵn sàng này, không cần quét hết tất cả mô tả. Độ phức tạp là O(1) cho số lượng sự kiện sẵn sàng, không phải O(n) cho tổng số kết nối.

Điều này có nghĩa là server có thể duy trì hàng chục nghìn kết nối với chi phí phụ tối thiểu. Kernel sẽ thông báo cho ứng dụng chỉ khi có kết nối thực sự có sự kiện. Ứng dụng không lãng phí chu kỳ CPU kiểm tra các kết nối không có gì mới.

## Mẫu code của NIO server

Triển khai một NIO server khác khá nhiều so với blocking I/O server. Thay vì vòng lặp chấp nhận-tạo-thread, NIO server có một vòng lặp sự kiện chính. Thread này chạy vòng lặp vô hạn, gọi `selector.select()` để chờ sự kiện, rồi xử lý từng sự kiện khi chúng đến.

```java
Selector selector = Selector.open();
ServerSocketChannel serverChannel = ServerSocketChannel.open();
serverChannel.configureBlocking(false);
serverChannel.bind(new InetSocketAddress(8080));
serverChannel.register(selector, SelectionKey.OP_ACCEPT);

while (true) {
    selector.select(); // Chặn cho đến khi có sự kiện

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
            // Client có dữ liệu để đọc
            SocketChannel client = (SocketChannel) key.channel();
            ByteBuffer buffer = ByteBuffer.allocate(1024);
            int bytesRead = client.read(buffer);

            if (bytesRead == -1) {
                client.close();
            } else {
                // Xử lý dữ liệu
                buffer.flip();
                // ... logic xử lý ...
                key.interestOps(SelectionKey.OP_WRITE);
            }
        }

        if (key.isWritable()) {
            // Client sẵn sàng để nhận phản hồi
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

Code này trông khác lạ đối với người quen với blocking I/O. Không có threads riêng cho mỗi kết nối. Không có thao tác đọc/ghi chặn. Thay vào đó, toàn bộ logic được tổ chức theo sự kiện. Khi có sự kiện, xử lý sự kiện đó, rồi quay lại chờ sự kiện tiếp theo.

Cái giá phải trả là độ phức tạp. Blocking I/O code dễ đọc, dễ gỡ lỗi, luồng chạy tuyến tính. NIO code phức tạp hơn nhiều. Logic bị phân mảnh theo các bộ xử lý sự kiện khác nhau. Quản lý trạng thái trở nên khó khăn vì không có thread riêng duy trì trạng thái cho mỗi kết nối. Trạng thái phải được gắn vào SelectionKey hoặc duy trì trong bảng ánh xạ bên ngoài.

## Kiến trúc hướng sự kiện và vòng callback lồng nhau

Mô hình NIO về bản chất là hướng sự kiện. Thay vì mệnh lệnh "đọc yêu cầu, xử lý, gửi phản hồi" theo tuần tự, NIO làm việc theo cơ chế phản ứng "khi có sự kiện X, làm Y". Điều này khá giống với vòng lặp sự kiện JavaScript trong Node.js hoặc trình duyệt.

Trong JavaScript, các bộ xử lý sự kiện được đăng ký cho các sự kiện khác nhau. Sự kiện nhấp chuột, callback hẹn giờ, phản hồi AJAX. Vòng lặp sự kiện của trình duyệt liên tục kiểm tra sự kiện và thực thi các bộ xử lý tương ứng. NIO Selector hoạt động tương tự, nhưng ở Java và với các sự kiện I/O mạng.

Mẫu này mạnh mẽ nhưng cũng có những cạm bẫy. Khi logic phức tạp, có thể rơi vào "vòng callback lồng nhau" - các callbacks lồng nhau khó duy trì. Trong NIO, nếu thao tác yêu cầu nhiều lượt tương tác (gửi yêu cầu, chờ phản hồi, xử lý, gửi tiếp theo), code có thể trở nên rối rắm. Trạng thái phải được theo dõi thủ công cho mỗi giai đoạn của thao tác.

Để giải quyết, nhiều khung làm việc xây dựng các lớp trừu tượng lên trên NIO. Netty, AsynchronousSocketChannel tích hợp sẵn của Java, các thư viện phản ứng như Project Reactor hay RxJava. Chúng cung cấp các API cấp cao hơn để làm việc với I/O không đồng bộ mà không cần xử lý trực tiếp với Selector và SelectionKeys ở tầng thấp.

## Khả năng mở rộng và sử dụng tài nguyên

Lợi ích lớn nhất của NIO là khả năng mở rộng. Với blocking I/O và mô hình một thread cho một kết nối, server bị giới hạn bởi số lượng threads có thể tạo ra. Hầu hết JVMs đạt giới hạn ở vài nghìn threads trước khi hiệu năng giảm nghiêm trọng hoặc gặp lỗi OutOfMemoryError.

Với NIO, giới hạn không phải threads mà là mô tả tệp. Trên Linux, mỗi tiến trình có giới hạn số mô tả tệp có thể mở (thường cấu hình qua ulimit). Giới hạn này có thể tăng lên hàng chục hoặc hàng trăm nghìn. Một NIO server với một hoặc vài threads có thể xử lý hàng chục nghìn kết nối đồng thời.

Trong thực tế, một server WebSocket được cải tiến lại từ blocking I/O sang NIO đã cho thấy sự cải thiện đáng kể. Trước khi cải tiến, server với 4GB RAM chỉ chịu được khoảng 3000 kết nối đồng thời. Sau khi cải tiến sử dụng NIO, cùng 4GB RAM, server xử lý được 50,000 kết nối. Việc sử dụng bộ nhớ chủ yếu là các buffer cho dữ liệu và thông tin kết nối, không phải stack của threads. Việc sử dụng CPU thấp hơn vì ít chuyển ngữ cảnh.

Tất nhiên, để đạt được hiệu suất này cần điều chỉnh cẩn thận. Kích thước buffers, số lượng selector threads, chiến lược xử lý logic nghiệp vụ. Nếu logic nghiệp vụ nặng và chạy trong selector thread, nó sẽ chặn vòng lặp sự kiện và làm giảm thông lượng. Thực hành tốt nhất là selector thread chỉ xử lý I/O, giao logic nghiệp vụ cho nhóm thread xử lý riêng.

## NIO trong các khung làm việc hiện đại

Hầu hết các khung làm việc và application servers Java hiện đại đều sử dụng NIO bên dưới. Netty là một khung NIO phổ biến nhất, được dùng bởi vô số dự án: Elasticsearch, Cassandra, triển khai gRPC Java, Play Framework, và nhiều nữa. Netty trừu tượng hóa độ phức tạp của NIO, cung cấp API hướng sự kiện dễ dùng hơn, và tối ưu hiệu năng đến mức cực kỳ cao.

Apache Tomcat từ phiên bản 8.5 dùng NIO connector mặc định. Jetty cũng vậy. Spring WebFlux, khung web phản ứng của Spring, được xây dựng trên Project Reactor và hỗ trợ các servers dựa trên NIO như Netty hoặc Undertow. Tất cả nhằm đạt được I/O không chặn cho khả năng mở rộng tốt hơn.

Node.js, thường được so sánh với Java về hiệu năng, cũng sử dụng vòng lặp sự kiện tương tự. Libuv, thư viện mà Node.js dựa vào, dùng epoll/kqueue/IOCP tùy nền tảng, giống như Java NIO Selector. Tư duy là giống nhau: một hoặc vài threads giám sát nhiều kết nối, xử lý sự kiện khi chúng đến.

Ngay cả khi không trực tiếp lập trình với NIO, hiểu về nó giúp đánh giá cao các khung làm việc đang sử dụng. Khi cấu hình Netty hoặc điều chỉnh Tomcat NIO connector, biết cách chúng hoạt động bên dưới giúp đưa ra quyết định sáng suốt về kích thước nhóm thread, cấu hình buffers, thiết lập hàng chờ kết nối.

## Đánh đổi và khi nào nên dùng

NIO không phải là giải pháp hoàn hảo cho mọi vấn đề. Nó tốt cho các ứng dụng phụ thuộc I/O với nhiều kết nối đồng thời nhưng mỗi yêu cầu không đòi hỏi nhiều tính toán. Ví dụ điển hình là các máy chủ proxy, cổng API, máy chủ WebSocket, ứng dụng trò chuyện. Những trường hợp sử dụng này phần lớn thời gian là chờ I/O, ít công việc tính toán nặng.

Nếu ứng dụng phụ thuộc CPU, ví dụ xử lý ảnh hoặc tính toán phức tạp, NIO không giúp được nhiều. Vấn đề không phải chờ I/O mà là thời gian tính toán. Khi đó, nhóm thread với blocking I/O hoặc các khung xử lý song song như Fork/Join có thể phù hợp hơn.

NIO cũng khó gỡ lỗi và kiểm thử hơn. Tình trạng tranh chấp, lỗi quản lý trạng thái trong code hướng sự kiện nổi tiếng khó xử lý. Blocking I/O code với một thread cho một yêu cầu dễ suy luận về hành vi. Mỗi yêu cầu có đường chạy riêng, dễ theo dõi. NIO code nhiều yêu cầu chia sẻ threads, khó theo dõi những gì đang xảy ra.

Thời gian phát triển cũng là một vấn đề cần xem xét. Viết NIO code từ đầu tốn nhiều thời gian hơn blocking I/O. Phải xử lý buffers, đọc/ghi từng phần, quản lý trạng thái. Nếu yêu cầu mở rộng không cao, sự đơn giản của blocking I/O có thể là sự đánh đổi đáng giá.

## Từ NIO đến NIO.2 và tương lai

Java 7 giới thiệu NIO.2 (hay còn gọi là AIO - Asynchronous I/O) với AsynchronousSocketChannel và AsynchronousServerSocketChannel. Khác với cách tiếp cận dựa trên selector của NIO, NIO.2 dùng callback hoặc API dựa trên Future. Thao tác I/O được khởi tạo và callback sẽ được gọi khi thao tác hoàn thành.

NIO.2 có mức độ trừu tượng cao hơn NIO, dễ sử dụng hơn trong một số trường hợp. Nhưng nó không thay thế hoàn toàn NIO. Netty vẫn dùng cách tiếp cận selector của NIO vì hiệu năng và khả năng kiểm soát. NIO.2 có thể tiện lợi nhưng đôi khi chi phí phụ cao hơn.

Tương lai của Java I/O đang hướng tới Project Loom. Loom giới thiệu virtual threads (fibers), các threads nhẹ được quản lý bởi JVM thay vì hệ điều hành. Với virtual threads, code có thể viết theo kiểu chặn nhưng bên dưới runtime lập lịch virtual threads hiệu quả, không tạo threads hệ điều hành cho mỗi kết nối. Ý tưởng là sự đơn giản của một thread cho một yêu cầu với khả năng mở rộng của NIO.

Khi Loom ổn định và được áp dụng rộng rãi, có thể sẽ có sự chuyển dịch trở lại về code kiểu chặn nhưng với runtime khác. Cho đến lúc đó, NIO vẫn là nền tảng của các máy chủ Java hiệu năng cao.

## Kết luận

Java NIO không chỉ là một API mới, mà là một sự thay đổi hoàn toàn tư duy trong cách thiết kế ứng dụng server. Nó buộc lập trình viên phải nghĩ về I/O theo mô hình hướng sự kiện thay vì mô hình chặn tuần tự. Sự đánh đổi là độ phức tạp tăng, nhưng phần thưởng là khả năng mở rộng lên hàng bậc về số kết nối đồng thời.

Hiểu NIO giúp đánh giá cao các khung làm việc hiện đại. Netty, Spring WebFlux, lập trình phản ứng - tất cả đều được xây dựng trên nền tảng này. Ngay cả khi không lập trình trực tiếp với Selector và Channels, các khái niệm của I/O không chặn, vòng lặp sự kiện, ghép kênh vẫn liên quan cho thiết kế hệ thống.

Blocking I/O vẫn có chỗ đứng cho các ứng dụng đơn giản, yêu cầu đồng thời thấp. Nhưng khi mở rộng là mục tiêu, khi số kết nối đồng thời lên hàng nghìn hoặc hàng chục nghìn, NIO là câu trả lời. Đó không phải chỉ là kỹ thuật tối ưu, mà là tư duy khác về cách server tương tác với mạng.

---

**Tham khảo:**

- "Java NIO" - Ron Hitchens
- "Netty in Action" - Norman Maurer & Marvin Allen Wolfthal
- Java NIO Documentation - Oracle
- "Scalable I/O in Java" - Doug Lea
