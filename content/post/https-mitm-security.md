+++
title = "Bảo mật mạng trong ứng dụng Java & JavaScript: từ HTTPS đến Man-in-the-Middle"
date = 2025-12-22T01:20:00+07:00
draft = false
categories = ["Security", "Java", "JavaScript", "Network"]
tags = ["HTTPS", "TLS", "SSL", "Security", "Man-in-the-Middle", "Java", "JavaScript", "Encryption"]
series = ["Network Programming"]
difficulty = "intermediate"
description = "Phân tích sâu về HTTPS, TLS và tấn công Man-in-the-Middle trong ứng dụng Java và JavaScript. Hiểu rõ vì sao HTTPS không còn là tùy chọn mà là yêu cầu bắt buộc"
image = "images/https-security.jpg"
+++

## HTTPS - Hơn cả một chữ S

Khi mình mới bắt đầu làm web, thường nghĩ HTTPS chỉ là HTTP thêm bảo mật, một tính năng "tốt là có" cho các website ngân hàng hay thương mại điện tử. Website blog cá nhân hay trang giới thiệu đơn giản dùng HTTP cũng không sao. Nhưng càng đi sâu vào bảo mật mạng, mình mới thấy suy nghĩ đó ngây thơ đến mức nào.

HTTPS không phải là một giao thức riêng biệt. Nó chính là HTTP chạy bên trên một lớp bảo mật gọi là TLS (Transport Layer Security), trước đây gọi là SSL (Secure Sockets Layer). Về bản chất, khi bạn truy cập `https://example.com`, trình duyệt không trực tiếp gửi yêu cầu HTTP lên máy chủ. Thay vào đó, nó thiết lập kết nối TLS trước, sau đó mới gửi dữ liệu HTTP qua kết nối đã được mã hóa này.

TLS hoạt động ở giữa tầng Transport (TCP) và tầng Application (HTTP). Nó tạo ra một đường hầm mã hóa cho luồng dữ liệu. Mọi thứ đi qua đường hầm này đều được mã hóa, từ HTTP headers đến nội dung yêu cầu, dữ liệu phản hồi, cookies, tokens. Người quan sát trên mạng chỉ thấy được chuỗi ký tự vô nghĩa đã mã hóa, không thể đọc được nội dung thực.

## Vì sao HTTP thuần túy nguy hiểm

HTTP là giao thức văn bản thuần. Khi bạn gửi yêu cầu, mọi thứ được truyền đi dưới dạng văn bản thuần túy qua mạng. Tên đăng nhập, mật khẩu, dữ liệu cá nhân, session tokens - tất cả đều lộ rõ cho bất kỳ ai có thể chặn lưu lượng mạng.

Hồi còn học đại học, mình từng dùng Wireshark để bắt gói tin trên WiFi của trường. Chỉ trong vài phút, mình có thể thấy hàng chục yêu cầu HTTP từ các bạn trong lớp. Một website không dùng HTTPS để đăng nhập, mình thấy rõ tên đăng nhập và mật khẩu trong nội dung POST. Cookies của Facebook, session IDs của các diễn đàn - tất cả đều bị lộ.

Điều đáng sợ là không cần phải là hacker để làm điều này. Bất kỳ ai ngồi chung WiFi công cộng với bạn đều có thể bắt lưu lượng mạng. Quán cà phê, sân bay, khách sạn - những nơi này là mỏ vàng cho kẻ tấn công. Họ chỉ cần dựng một điểm phát WiFi với tên giống WiFi chính thức, đợi người dùng kết nối vào, và âm thầm bắt toàn bộ lưu lượng HTTP.

## Tấn công Man-in-the-Middle - Khi kẻ thứ ba chen vào

Tấn công Man-in-the-Middle (MITM) còn nguy hiểm hơn việc nghe lén thụ động. Trong cuộc tấn công này, kẻ tấn công không chỉ quan sát lưu lượng mà còn có thể chỉnh sửa nó. Họ đặt mình ở giữa máy khách và máy chủ, chặn các yêu cầu từ máy khách, có thể sửa đổi rồi chuyển tiếp đến máy chủ. Tương tự, phản hồi từ máy chủ cũng đi qua kẻ tấn công trước khi đến máy khách.

Cách hoạt động cụ thể như thế này. Giả sử bạn đang kết nối vào `http://bank.com`. Yêu cầu của bạn phải đi qua router, nhà cung cấp dịch vụ Internet, có thể qua nhiều điểm trung gian trước khi đến máy chủ. Kẻ tấn công có thể xâm nhập bất kỳ điểm nào trên đường đi này. Khi yêu cầu đến máy của kẻ tấn công, họ có toàn quyền đọc và sửa đổi.

Một kịch bản phổ biến là ARP spoofing trên mạng nội bộ. Kẻ tấn công gửi các thông điệp ARP giả mạo để lừa các thiết bị nghĩ rằng máy của họ là cổng gateway. Mọi lưu lượng từ nạn nhân đều được định tuyến qua máy của kẻ tấn công trước. Họ có thể thay đổi giá trong các yêu cầu thương mại điện tử, chèn mã độc vào phản hồi HTML, hoặc đơn giản là đánh cắp thông tin đăng nhập.

Với HTTP, không có cách nào để máy khách xác minh rằng phản hồi thực sự đến từ máy chủ hợp lệ. Máy khách gửi yêu cầu đến địa chỉ IP, nhận phản hồi từ IP đó, và tin tưởng phản hồi. Nhưng nếu kẻ tấn công kiểm soát định tuyến hoặc DNS, họ có thể điều hướng lưu lượng đến máy chủ giả mạo của họ. Máy khách không có cách phân biệt.

## TLS và chuỗi tin cậy chứng chỉ

TLS giải quyết vấn đề này thông qua mã hóa và các tổ chức cấp chứng chỉ. Khi máy khách kết nối đến máy chủ HTTPS, máy chủ phải xuất trình một chứng chỉ số. Chứng chỉ này chứa khóa công khai của máy chủ và được ký bởi một Certificate Authority (CA) đáng tin cậy.

Trình duyệt có danh sách các CA đáng tin cậy được tích hợp sẵn. Khi nhận chứng chỉ từ máy chủ, trình duyệt xác minh chữ ký của CA. Nếu chữ ký hợp lệ và CA nằm trong danh sách đáng tin cậy, trình duyệt tin rằng chứng chỉ xác thực. Lúc này, máy khách và máy chủ thực hiện giao thức trao đổi khóa (thường là Diffie-Hellman hoặc RSA) để thiết lập một khóa bí mật chung. Khóa bí mật này dùng để mã hóa tất cả giao tiếp sau đó.

Điều quan trọng là kẻ tấn công không thể làm giả chứng chỉ. Để tạo chứng chỉ hợp lệ cho `bank.com`, họ cần khóa riêng của một CA. Nhưng các CA bảo vệ khóa riêng của họ vô cùng nghiêm ngặt. Nếu một CA bị xâm nhập, trình duyệt hiện đại sẽ thu hồi lòng tin đối với CA đó.

Ngay cả khi kẻ tấn công có thể chặn lưu lượng TLS, họ chỉ thấy dữ liệu đã mã hóa. Không có khóa riêng của máy chủ, họ không thể giải mã. Nếu họ cố chỉnh sửa dữ liệu đã mã hóa, kiểm tra tính toàn vẹn sẽ thất bại và kết nối bị ngắt. Máy khách sẽ thấy lỗi thay vì nhận dữ liệu bị hỏng.

## HTTPS trong ứng dụng máy chủ Java

Khi phát triển backend Java, bật TLS là một phần thiết yếu của thiết lập môi trường thực tế. Java sử dụng keystore để quản lý chứng chỉ và khóa riêng. Keystore là một tệp mã hóa chứa chứng chỉ và khóa, được bảo vệ bởi mật khẩu.

Để thiết lập HTTPS trong máy chủ ứng dụng Java như Tomcat, bạn cần tạo hoặc lấy một chứng chỉ. Trong quá trình phát triển, bạn có thể tự tạo chứng chỉ tự ký bằng keytool:

```bash
keytool -genkeypair -alias myserver -keyalg RSA -keysize 2048 \
    -validity 365 -keystore keystore.jks -storepass changeit
```

Lệnh này tạo một cặp khóa RSA và chứng chỉ tự ký, lưu chúng trong `keystore.jks`. Trong môi trường thực tế, thay vì chứng chỉ tự ký, bạn sẽ yêu cầu chứng chỉ từ một CA đáng tin cậy như Let's Encrypt, DigiCert, hoặc Comodo.

Cấu hình Tomcat để dùng keystore:

```xml
<Connector port="8443" protocol="org.apache.coyote.http11.Http11NioProtocol"
           maxThreads="150" SSLEnabled="true">
    <SSLHostConfig>
        <Certificate certificateKeystoreFile="conf/keystore.jks"
                     certificateKeystorePassword="changeit"
                     type="RSA" />
    </SSLHostConfig>
</Connector>
```

Với Spring Boot, cấu hình còn đơn giản hơn trong `application.properties`:

```properties
server.port=8443
server.ssl.key-store=classpath:keystore.jks
server.ssl.key-store-password=changeit
server.ssl.key-store-type=JKS
server.ssl.key-alias=myserver
```

Khi máy chủ khởi động, phần triển khai SSL/TLS của Java (JSSE - Java Secure Socket Extension) xử lý toàn bộ quá trình bắt tay TLS, mã hóa và giải mã. Mã nguồn ứng dụng của bạn không cần biết gì về việc mã hóa bên dưới. Bạn vẫn đọc yêu cầu và gửi phản hồi như bình thường, JSSE tự động mã hóa/giải mã ở phía dưới.

Một thực hành tốt quan trọng là buộc chuyển hướng sang HTTPS. Nếu người dùng vô tình truy cập `http://example.com`, máy chủ nên chuyển hướng đến `https://example.com`. Trong Spring Security:

```java
@Configuration
public class SecurityConfig extends WebSecurityConfigurerAdapter {
    @Override
    protected void configure(HttpSecurity http) throws Exception {
        http.requiresChannel()
            .anyRequest()
            .requiresSecure(); // Buộc dùng HTTPS
    }
}
```

## JavaScript và các hạn chế bảo mật của trình duyệt

Phía máy khách, JavaScript trong trình duyệt cũng có những hạn chế nghiêm ngặt liên quan đến HTTPS. Trình duyệt hiện đại triển khai nhiều tính năng bảo mật chỉ khả dụng khi trang được phục vụ qua HTTPS.

Service Workers, một công nghệ cho Progressive Web Apps và chức năng ngoại tuyến, hoàn toàn yêu cầu HTTPS. Trình duyệt không cho đăng ký service workers từ các trang HTTP (trừ localhost cho phát triển). Lý do là service workers có quyền chặn các yêu cầu mạng và chỉnh sửa phản hồi. Nếu kẻ tấn công có thể chèn service worker độc hại qua HTTP, họ có thể kiểm soát toàn bộ các yêu cầu tiếp theo của người dùng.

Geolocation API, truy cập camera và microphone, clipboard API, payment request API - tất cả đều yêu cầu HTTPS. Trình duyệt không muốn các quyền nhạy cảm này được cấp cho các trang có thể không an toàn. Nếu trang được phục vụ qua HTTP, kẻ tấn công có thể chỉnh sửa JavaScript để lạm dụng những quyền này.

Cookies với cờ `Secure` chỉ được gửi qua kết nối HTTPS. Đây là cách bảo vệ session cookies khỏi bị đánh cắp qua HTTP. Khi đặt cookie:

```javascript
document.cookie = "sessionId=abc123; Secure; HttpOnly; SameSite=Strict";
```

Cờ `Secure` đảm bảo rằng ngay cả khi người dùng vô tình truy cập phiên bản HTTP của trang, session cookie sẽ không được gửi. `HttpOnly` ngăn JavaScript truy cập (bảo vệ khỏi XSS), và `SameSite=Strict` ngăn cookie được gửi trong các yêu cầu từ trang khác (bảo vệ khỏi CSRF).

HTTP Strict Transport Security (HSTS) là một cơ chế mà máy chủ có thể ra lệnh cho trình duyệt "luôn luôn dùng HTTPS cho tên miền này". Máy chủ gửi header:

```http
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

Trình duyệt sẽ nhớ chỉ thị này trong 31536000 giây (1 năm). Trong thời gian đó, mọi nỗ lực truy cập phiên bản HTTP sẽ tự động chuyển hướng sang HTTPS ngay ở trình duyệt, không cần vòng đi tới máy chủ. Điều này ngăn chặn một loại tấn công MITM gọi là SSL stripping, nơi kẻ tấn công hạ cấp kết nối HTTPS xuống HTTP.

## Nội dung hỗn hợp và cảnh báo của trình duyệt

Một vấn đề phổ biến khi chuyển đổi từ HTTP sang HTTPS là nội dung hỗn hợp. Nếu trang HTTPS tải tài nguyên (scripts, stylesheets, hình ảnh) qua HTTP, trình duyệt sẽ chặn hoặc cảnh báo. Lý do là ngay cả khi trang chính được bảo mật, tài nguyên HTTP có thể bị sửa đổi bởi kẻ tấn công, xâm phạm toàn bộ trang.

Ví dụ, nếu trang HTTPS bao gồm:

```html
<script src="http://cdn.example.com/jquery.js"></script>
```

Trình duyệt sẽ chặn script này. Kẻ tấn công có thể thực hiện MITM trên kết nối đến CDN và chèn mã độc vào jQuery. Dù trang chính được phân phối an toàn, script bị chèn có toàn quyền truy cập để đánh cắp dữ liệu.

Các trình duyệt hiện đại phân loại nội dung hỗn hợp thành hai loại. Nội dung hỗn hợp thụ động (hình ảnh, âm thanh, video) được tải nhưng có cảnh báo. Nội dung hỗn hợp chủ động (scripts, stylesheets, fonts) bị chặn hoàn toàn. Để khắc phục, bạn phải đảm bảo tất cả tài nguyên được tải qua HTTPS hoặc dùng URL tương đối theo giao thức:

```html
<script src="//cdn.example.com/jquery.js"></script>
```

URL tương đối theo giao thức kế thừa giao thức của trang cha. Nếu trang là HTTPS, tài nguyên cũng được tải qua HTTPS.

## Xác thực chứng chỉ và vấn đề tin cậy

Mặc dù TLS cung cấp bảo mật mạnh, nó phụ thuộc vào việc xác thực chứng chỉ. Nếu máy khách không xác thực chứng chỉ đúng cách, bảo mật bị xâm phạm. Một lỗi phổ biến trong mã Java là vô hiệu hóa xác thực chứng chỉ trong quá trình phát triển rồi quên bật lại trong môi trường thực tế.

Mình từng thấy mã như này trong sản phẩm thực tế:

```java
// NGUY HIỂM: Vô hiệu hóa xác thực chứng chỉ
TrustManager[] trustAllCerts = new TrustManager[] {
    new X509TrustManager() {
        public X509Certificate[] getAcceptedIssuers() { return null; }
        public void checkClientTrusted(X509Certificate[] certs, String authType) {}
        public void checkServerTrusted(X509Certificate[] certs, String authType) {}
    }
};

SSLContext sc = SSLContext.getInstance("SSL");
sc.init(null, trustAllCerts, new java.security.SecureRandom());
HttpsURLConnection.setDefaultSSLSocketFactory(sc.getSocketFactory());
```

Mã này chấp nhận bất kỳ chứng chỉ nào, kể cả chứng chỉ tự ký hay đã hết hạn. Điều này hoàn toàn phá hủy bảo mật TLS. Kẻ tấn công có thể xuất trình chứng chỉ giả mạo và máy khách sẽ vui vẻ chấp nhận.

Xác thực chứng chỉ đúng cách kiểm tra nhiều thứ: chứng chỉ chưa hết hạn, được cấp bởi CA đáng tin cậy, được cấp cho đúng tên miền (Common Name hoặc Subject Alternative Names khớp), chuỗi chứng chỉ hợp lệ, chứng chỉ chưa bị thu hồi. Triển khai SSL mặc định của Java làm tất cả các kiểm tra này, nhưng các lập trình viên đôi khi vô hiệu hóa vì "lỗi chứng chỉ" trong quá trình phát triển.

Cách tiếp cận tốt hơn là dùng chứng chỉ đúng cách ngay cả trong phát triển. Let's Encrypt cung cấp chứng chỉ miễn phí, hoặc bạn có thể thiết lập CA nội bộ cho tổ chức. Nếu thực sự cần chứng chỉ tự ký trong phát triển, thêm chúng vào truststore của Java thay vì vô hiệu hóa xác thực hoàn toàn.

## Certificate pinning - Lớp bảo mật thêm

Đối với các ứng dụng bảo mật cao, certificate pinning cung cấp thêm một lớp bảo vệ. Thay vì tin tưởng bất kỳ CA nào trong kho tin cậy hệ thống, ứng dụng chỉ chấp nhận chứng chỉ được ký bởi CA cụ thể hoặc chỉ chấp nhận một chứng chỉ cụ thể.

Khái niệm là ứng dụng "ghim" chứng chỉ hoặc khóa công khai mong đợi. Khi kết nối đến máy chủ, nếu chứng chỉ được xuất trình không khớp với chứng chỉ đã ghim, kết nối bị từ chối ngay cả khi chứng chỉ hợp lệ theo quy tắc xác thực bình thường.

Trong phát triển Android với Java/Kotlin:

```java
CertificatePinner certificatePinner = new CertificatePinner.Builder()
    .add("api.example.com", "sha256/AAAAAAAAAAAABBBBBBBBBBBBCCCCCCCCCCCC=")
    .build();

OkHttpClient client = new OkHttpClient.Builder()
    .certificatePinner(certificatePinner)
    .build();
```

Ghim chứng chỉ bảo vệ khỏi các CA bị xâm nhập. Nếu một CA bị hack và cấp chứng chỉ giả cho `api.example.com`, xác thực bình thường sẽ chấp nhận chứng chỉ đó. Nhưng với ghim chứng chỉ, ứng dụng phát hiện rằng chứng chỉ không khớp với giá trị đã ghim và từ chối kết nối.

Nhược điểm của ghim chứng chỉ là nó khiến việc xoay vòng chứng chỉ khó hơn. Khi chứng chỉ máy chủ hết hạn và được gia hạn, giá trị đã ghim thay đổi. Các ứng dụng đã triển khai sẽ thất bại khi kết nối. Bạn cần lập kế hoạch trước, ghim nhiều chứng chỉ (hiện tại và dự phòng), và cập nhật các giá trị ghim trước khi chứng chỉ hết hạn.

## Cân nhắc về hiệu năng của TLS

Một mối quan tâm phổ biến về HTTPS là chi phí hiệu năng. Quá trình bắt tay TLS yêu cầu thêm vòng đi, mã hóa/giải mã tiêu tốn CPU. Nhưng trong thực tế, chi phí này tối thiểu với phần cứng hiện đại và các triển khai đã tối ưu.

TLS 1.3, phiên bản mới nhất, giảm quá trình bắt tay từ 2 vòng đi xuống 1 vòng đi so với TLS 1.2. Điều này cắt giảm độ trễ đáng kể cho việc thiết lập kết nối. Khôi phục phiên cho phép máy khách tái sử dụng khóa phiên trước đó, bỏ qua hoàn toàn quá trình bắt tay đầy đủ cho các kết nối tiếp theo.

Các CPU hiện đại có AES-NI (Advanced Encryption Standard New Instructions), tăng tốc phần cứng cho mã hóa AES. Với AES-NI, chi phí mã hóa gần như không đáng kể. Máy chủ có thể xử lý hàng nghìn kết nối TLS mà mức sử dụng CPU chỉ tăng vài phần trăm.

HTTP/2, yêu cầu HTTPS trong hầu hết triển khai trình duyệt, thực ra cải thiện hiệu năng so với HTTP/1.1. Ghép kênh, nén header, đẩy từ máy chủ đều đóng góp vào việc tải trang nhanh hơn. Trong nhiều thử nghiệm, HTTPS với HTTP/2 nhanh hơn HTTP thuần túy với HTTP/1.1.

Google và các đại gia công nghệ khác đã chứng minh rằng chi phí HTTPS không đáng kể. Google báo cáo rằng chuyển Gmail sang HTTPS chỉ thêm dưới 1% tải máy chủ và không có tác động đáng chú ý đến trải nghiệm người dùng.

## HTTPS không còn là tùy chọn

Năm 2018, Google Chrome bắt đầu đánh dấu tất cả các trang HTTP là "Not Secure" trong thanh địa chỉ. Firefox, Safari, Edge đều làm theo. Người dùng nhìn thấy cảnh báo rõ ràng khi truy cập các trang HTTP. Điều này tạo động lực mạnh mẽ cho chủ trang chuyển sang HTTPS.

Let's Encrypt, một tổ chức cấp chứng chỉ miễn phí, đã loại bỏ rào cản chi phí của HTTPS. Gia hạn chứng chỉ có thể tự động hóa qua giao thức ACME. Không còn lý do nào để không dùng HTTPS.

Công cụ tìm kiếm như Google ưu tiên các trang HTTPS trong xếp hạng. Các trang HTTP bị phạt. Từ góc độ kinh doanh, không dùng HTTPS nghĩa là mất lưu lượng truy cập và doanh thu.

Các nhà cung cấp trình duyệt đang dần ngừng hỗ trợ các tính năng cho HTTP. Chrome đã thông báo rằng các tính năng mạnh sẽ yêu cầu ngữ cảnh bảo mật. Trong tương lai, có thể HTTP sẽ bị xem như giao thức lỗi thời, chỉ dùng cho hệ thống cũ.

Từ góc nhìn lập trình viên, HTTPS phải là lựa chọn mặc định. Khi bắt đầu dự án mới, thiết lập HTTPS ngay từ đầu. Đừng đợi đến khi ra mắt rồi mới chuyển đổi, vì việc chuyển đổi có thể gây lỗi và đòi hỏi nỗ lực lớn. Môi trường phát triển nên phản ánh môi trường thực tế càng nhiều càng tốt, bao gồm cả HTTPS.

## Kết luận

HTTPS và TLS không phải là "tính năng thêm" hay "tốt là có". Chúng là yêu cầu cơ bản cho bất kỳ ứng dụng web nào xử lý dữ liệu người dùng. Các cuộc tấn công Man-in-the-Middle không phải là mối đe dọa lý thuyết - chúng xảy ra mỗi ngày trên mạng WiFi công cộng, router bị xâm nhập, và các nhà cung cấp dịch vụ Internet độc hại.

HTTP lộ mọi thứ dưới dạng văn bản thuần. Mật khẩu, thông tin cá nhân, session tokens - tất cả lộ rõ cho kẻ tấn công. TLS mã hóa giao tiếp, xác minh danh tính máy chủ, và đảm bảo tính toàn vẹn dữ liệu. Đây không phải là kịch bản bảo mật, mà là các biện pháp bảo vệ thiết yếu mà người dùng xứng đáng được có.

Trong các ứng dụng Java, việc kích hoạt TLS đơn giản với keystore và cấu hình SSL. Các tính năng bảo mật của trình duyệt ngày càng yêu cầu HTTPS, từ service workers đến các API mạnh. Chi phí hiệu năng của TLS tối thiểu và được bù đắp bởi các cải tiến như HTTP/2.

Là lập trình viên, trách nhiệm của chúng ta là bảo vệ dữ liệu người dùng. HTTPS là mức tối thiểu. Không triển khai HTTPS trong năm 2025 không chỉ là thiếu trách nhiệm mà còn có thể để lộ người dùng trước các cuộc tấn công. Các công cụ và hạ tầng sẵn có để làm cho HTTPS dễ dàng và miễn phí. Không còn lý do gì để không dùng nó.

---

**Tham khảo:**

- RFC 8446 (TLS 1.3)
- OWASP Transport Layer Protection Cheat Sheet
- "Bulletproof SSL and TLS" - Ivan Ristić
- Let's Encrypt Documentation
- MDN Web Security Documentation
