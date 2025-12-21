+++
title = "CORS và Same-Origin Policy dưới góc nhìn mạng máy tính (JavaScript)"
date = 2025-12-22T01:11:00+07:00
draft = false
categories = ["Web Security", "JavaScript", "Network"]
tags = ["CORS", "Same-Origin Policy", "Security", "JavaScript", "HTTP", "Browser"]
series = ["Network Programming"]
difficulty = "intermediate"
description = "Phân tích sâu về Same-Origin Policy và CORS từ góc độ bảo mật web và mạng máy tính. Hiểu rõ preflight request, vì sao Postman không gặp CORS, và vai trò của browser trong việc bảo vệ người dùng"
image = "images/cors.jpg"
+++

## Khi trình duyệt trở thành bức tường bảo vệ

Hồi mới học web development, mình thường gặp lỗi này khi gọi API từ frontend: "Access to fetch at 'https://api.example.com' from origin 'http://localhost:3000' has been blocked by CORS policy". Lúc đầu nghĩ đây là lỗi code, sửa mãi không được. Rồi mình test API bằng Postman thì thấy nó chạy ngon lành. Càng confused hơn, API hoạt động tốt mà sao trình duyệt lại chặn?

Câu trả lời nằm ở chỗ trình duyệt không phải là một HTTP client thông thường như Postman hay curl. Trình duyệt là một môi trường thực thi code với quyền truy cập vào cookies, localStorage, session tokens của người dùng. Nếu không có cơ chế bảo mật, bất kỳ website nào cũng có thể chạy JavaScript để đánh cắp dữ liệu từ các site khác mà user đang đăng nhập.

## Same-Origin Policy - Nền tảng bảo mật web

Same-Origin Policy ra đời từ những ngày đầu của web để ngăn chặn một website đọc dữ liệu từ website khác. Hai URL được coi là cùng origin nếu chúng có cùng protocol, domain và port. Ví dụ, `https://example.com:443/page1` và `https://example.com:443/page2` là cùng origin. Nhưng `https://example.com` và `http://example.com` khác origin vì protocol khác nhau. Tương tự, `https://example.com` và `https://api.example.com` cũng khác origin vì subdomain khác nhau.

Chính sách này nghe có vẻ strict, nhưng hãy tưởng tượng kịch bản sau. Bạn đang đăng nhập vào ngân hàng ở tab này, session cookie được lưu trong browser. Sau đó bạn vào một website độc hại ở tab khác. Nếu không có Same-Origin Policy, website đó có thể chạy JavaScript để gửi request đến `https://bank.com/api/transfer` với credentials của bạn. Vì cookies được tự động gửi kèm trong mỗi request đến cùng domain, ngân hàng sẽ nghĩ đây là request hợp lệ từ bạn và thực hiện chuyển tiền.

Đây chính là CSRF (Cross-Site Request Forgery) attack. Same-Origin Policy ngăn chặn scenario này bằng cách không cho phép JavaScript từ `evil.com` đọc response từ `bank.com`. Request vẫn được gửi đi (vì HTTP protocol không biết gì về origins), nhưng trình duyệt sẽ chặn JavaScript access vào response data.

Điểm quan trọng cần hiểu là Same-Origin Policy được implement ở tầng ứng dụng bởi trình duyệt, không phải ở network layer hay transport layer. Nếu nhìn qua mô hình OSI, HTTP request vẫn đi qua các tầng Physical, Data Link, Network, Transport một cách bình thường. Server nhận request, xử lý và gửi response về. Nhưng khi response về đến browser (tầng Application), browser kiểm tra origin và quyết định có cho phép JavaScript access hay không.

## Vấn đề với modern web applications

Thời đầu web, các trang đều static HTML được serve từ cùng một domain. Same-Origin Policy hoạt động hoàn hảo. Nhưng modern architecture lại khác. Frontend chạy trên `https://app.example.com`, backend API ở `https://api.example.com`, CDN serving assets từ `https://cdn.example.com`. Đây là các origins khác nhau, và Same-Origin Policy sẽ block tất cả.

Mình từng làm một project mà frontend được deploy lên Netlify (`https://myapp.netlify.app`) còn backend API chạy trên Heroku (`https://myapi.herokuapp.com`). Khi frontend gọi API, browser ngay lập tức block với CORS error. Đây không phải là lỗi của code, mà là Same-Origin Policy đang làm đúng nhiệm vụ bảo vệ. Vấn đề là làm sao để cho phép cross-origin requests một cách có kiểm soát?

## CORS - Cơ chế nới lỏng có kiểm soát

CORS (Cross-Origin Resource Sharing) ra đời như một mechanism để server có thể explicit cho phép requests từ origins khác. Ý tưởng đơn giản: server gửi các headers đặc biệt trong response để báo cho browser biết "origin này được phép truy cập resource của tôi".

Header quan trọng nhất là `Access-Control-Allow-Origin`. Khi server gửi header này trong response, browser sẽ kiểm tra xem origin của request có match với value trong header không. Nếu match, JavaScript được phép access response. Nếu không match, browser block access.

Ví dụ, khi frontend ở `https://app.example.com` gọi API ở `https://api.example.com`:

```javascript
// Frontend code chạy trên https://app.example.com
fetch('https://api.example.com/users')
    .then(response => response.json())
    .then(data => console.log(data))
    .catch(error => console.error('CORS error:', error));
```

Browser sẽ gửi request với header `Origin: https://app.example.com`. Server nhận request, xử lý, và trả về response kèm header:

```
Access-Control-Allow-Origin: https://app.example.com
```

Browser thấy origin match, cho phép JavaScript access data. Simple và hiệu quả.

## Preflight request - Bước kiểm tra an toàn

Nhưng có một điều thú vị. Đối với một số loại requests, browser không gửi actual request ngay lập tức. Thay vào đó, nó gửi một "preflight" request dùng method OPTIONS để hỏi server "tôi muốn gửi request này, bạn có cho phép không?". Server phải respond với các CORS headers thích hợp, browser mới gửi actual request.

Preflight request xảy ra khi request không phải là "simple request". Simple request phải thỏa mãn tất cả các điều kiện sau: method phải là GET, HEAD hoặc POST; không có custom headers ngoài một số headers được cho phép như Content-Type, Accept; nếu có Content-Type thì phải là `application/x-www-form-urlencoded`, `multipart/form-data` hoặc `text/plain`.

Nghe phức tạp, nhưng về cơ bản, nếu bạn gửi JSON với `Content-Type: application/json` hoặc thêm custom header như `Authorization: Bearer token`, request không còn "simple" nữa. Browser sẽ gửi preflight.

Tại sao lại cần preflight? Lý do là để protect legacy servers. Trước khi CORS ra đời, nhiều servers được build với giả định rằng chỉ same-origin requests mới đến được. Nếu browser cho phép cross-origin requests với methods như PUT, DELETE hoặc custom headers mà không kiểm tra trước, những servers này có thể bị attack. Preflight request cho server cơ hội từ chối trước khi actual request được gửi.

Ví dụ khi gửi JSON:

```javascript
// Request này sẽ trigger preflight
fetch('https://api.example.com/users', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer mytoken123'
    },
    body: JSON.stringify({ name: 'John' })
});
```

Browser sẽ gửi preflight request trước:

```
OPTIONS /users HTTP/1.1
Host: api.example.com
Origin: https://app.example.com
Access-Control-Request-Method: POST
Access-Control-Request-Headers: Content-Type, Authorization
```

Server phải respond:

```
HTTP/1.1 204 No Content
Access-Control-Allow-Origin: https://app.example.com
Access-Control-Allow-Methods: POST, GET, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
Access-Control-Max-Age: 86400
```

`Access-Control-Max-Age` cho browser biết có thể cache preflight response trong 86400 giây (24 giờ). Trong thời gian này, browser không cần gửi preflight lại cho cùng loại request, giảm overhead.

## Tại sao Postman không gặp CORS

Đây là câu hỏi mình hay gặp nhất. API chạy tốt trên Postman nhưng lại CORS error trên browser. Nguyên nhân đơn giản: Postman không phải là trình duyệt web. Nó là một HTTP client thuần túy, không implement Same-Origin Policy.

Khi bạn gửi request từ Postman, nó chỉ đơn giản là tạo HTTP request, gửi đi, nhận response và hiển thị. Không có khái niệm "origin", không có security restrictions. Postman không chạy JavaScript từ websites mà user đang browse, nên không cần bảo vệ user khỏi malicious scripts.

Còn browser thì khác. Browser là một platform chạy code từ bất kỳ website nào user visit. Nếu không có Same-Origin Policy và CORS, một website độc hại có thể exploit browser để truy cập dữ liệu từ các sites khác, sử dụng cookies và credentials của user. Browser phải assume rằng mọi website đều potentially malicious và áp dụng các restrictions tương ứng.

Đây cũng là lý do tại sao backend developers thường confused về CORS. Khi họ test API bằng curl hoặc Postman, mọi thứ work perfectly. Nhưng khi frontend team integrate, lại báo CORS errors. Đó không phải lỗi của API code, mà là vì API chưa được config để accept cross-origin requests từ browser.

## CORS trong kiến trúc phân tầng

Để hiểu rõ hơn vị trí của CORS trong stack, hãy nhìn vào mô hình OSI. HTTP request bắt đầu từ tầng Application (tầng 7), đi xuống qua Presentation, Session, Transport (TCP), Network (IP), Data Link, và cuối cùng là Physical layer. Data được encode, packet-ized, routed và transmitted qua network.

Ở phía server, request đi ngược lại từ Physical lên Application. Server process request ở tầng Application, generate response và gửi xuống ngược lại. Response travel qua các tầng giống như request.

Same-Origin Policy và CORS hoạt động hoàn toàn ở tầng Application, specifically là ở browser runtime. Network layers bên dưới không biết gì về origins hay CORS. TCP connection được establish bình thường, HTTP request được gửi và nhận response thành công. Chỉ khi response về đến browser, JavaScript runtime mới kiểm tra CORS headers và quyết định có expose response cho script hay không.

Điều này giải thích tại sao bạn có thể thấy request thành công trong Network tab của DevTools (vì request đã đến server và nhận về response ở HTTP level), nhưng JavaScript vẫn báo lỗi CORS (vì browser block access ở Application level).

## Implement CORS ở backend

Việc enable CORS ở backend khá straightforward nhưng cần cẩn thận. Nhiều developers để `Access-Control-Allow-Origin: *` cho tiện, nhưng đây là security risk. Wildcard cho phép mọi origin access API của bạn, kể cả các malicious sites.

Better practice là explicitly list allowed origins. Nếu bạn có nhiều environments (dev, staging, production), maintain một whitelist:

```javascript
// Node.js/Express example
const allowedOrigins = [
    'https://app.example.com',
    'https://staging.example.com',
    'http://localhost:3000' // Development
];

app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }
    
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Max-Age', '86400');
    
    // Handle preflight
    if (req.method === 'OPTIONS') {
        return res.sendStatus(204);
    }
    
    next();
});
```

Header `Access-Control-Allow-Credentials` cần đặc biệt chú ý. Nếu set `true`, browser sẽ include cookies và authorization headers trong cross-origin requests. Nhưng khi enable credentials, bạn không thể dùng wildcard `*` cho Allow-Origin, phải specify exact origin.

Trong Java Spring Boot, config còn đơn giản hơn:

```java
@Configuration
public class CorsConfig implements WebMvcConfigurer {
    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOrigins(
                    "https://app.example.com",
                    "http://localhost:3000"
                )
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                .allowedHeaders("Content-Type", "Authorization")
                .allowCredentials(true)
                .maxAge(86400);
    }
}
```

## Debugging CORS issues

Khi gặp CORS errors, bước đầu tiên là mở DevTools Network tab. Tìm request bị block và check cả request headers lẫn response headers. Request phải có header `Origin`, còn response phải có `Access-Control-Allow-Origin`.

Nếu thấy preflight request (method OPTIONS) failed, nghĩa là server chưa handle preflight đúng cách. Server phải respond với status 200 hoặc 204 và include tất cả CORS headers cần thiết.

Một trick mình hay dùng là temporary disable CORS ở browser để verify rằng vấn đề thực sự là CORS chứ không phải lỗi khác. Chrome có thể start với flag `--disable-web-security`. Nhưng nhớ rằng đây chỉ để debug, never dùng trong production.

Nếu API của bạn phía sau proxy hoặc load balancer, đảm bảo rằng CORS headers không bị strip đi. Một số proxies có default config remove certain headers. Bạn cần config proxy để preserve CORS headers hoặc thêm headers ở proxy level.

## CORS với credentials và authentication

Khi làm việc với authenticated APIs, CORS trở nên phức tạp hơn một chút. Nếu API yêu cầu authentication token trong header (ví dụ JWT), frontend phải include credentials trong fetch request:

```javascript
fetch('https://api.example.com/protected', {
    method: 'GET',
    credentials: 'include', // Quan trọng!
    headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json'
    }
})
.then(response => response.json())
.then(data => console.log(data));
```

Setting `credentials: 'include'` tells browser gửi cookies và authorization headers. Server phải respond với `Access-Control-Allow-Credentials: true` và một specific origin (không được dùng wildcard).

Một pattern hay gặp là dùng cookies cho session management. Browser automatically gửi cookies trong mọi request đến domain đó, kể cả cross-origin requests. Nhưng với CORS, cookies chỉ được gửi nếu `credentials: 'include'` ở client và `Allow-Credentials: true` ở server. Đây là layer bảo vệ thêm để prevent accidental credential leakage.

## CORS không phải silver bullet

Quan trọng là hiểu rằng CORS không phải là security feature cho backend. Nó là một browser security mechanism để protect users. Backend vẫn phải implement proper authentication và authorization. Việc một request pass được CORS check không có nghĩa là request đó legitimate.

Hacker có thể bypass CORS bằng cách gửi requests từ server-side code (không qua browser) hoặc dùng proxy. CORS chỉ prevent malicious websites từ việc sử dụng browser của user để attack. Nó không protect API khỏi direct attacks.

Vì thế, backend phải luôn validate requests, check authentication tokens, verify permissions. CORS chỉ là một layer trong defense-in-depth strategy, không phải là duy nhất.

## Security considerations

Khi config CORS, easy mistake là quá permissive. Setting `Access-Control-Allow-Origin: *` tiện lợi nhưng nguy hiểm. Bất kỳ website nào cũng có thể call API của bạn từ browser. Nếu API không require authentication, data có thể bị leaked.

Worse hơn, nếu bạn set wildcard và enable credentials cùng lúc, browser sẽ reject (thankfully). Nhưng nhiều developers thấy error rồi fix bằng cách allow specific origin trong code nhưng vẫn check origin không cẩn thận, leading to bypass opportunities.

Một attack vector là subdomain takeover. Nếu bạn allow `*.example.com`, attacker có thể takeover một abandoned subdomain và sử dụng nó để call API với valid origin. Better practice là whitelist exact subdomains bạn control.

Reflect origin từ request header vào response cũng nguy hiểm. Nếu code chỉ đơn giản là `res.setHeader('Access-Control-Allow-Origin', req.headers.origin)`, bất kỳ origin nào cũng qua. Phải validate origin against whitelist trước.

## Kết luận

Same-Origin Policy và CORS thường bị hiểu lầm là "lỗi phiền phức" của web development. Nhưng thực ra chúng là những mechanisms quan trọng bảo vệ users khỏi cross-site attacks. Hiểu rõ cách chúng hoạt động ở tầng mạng và browser runtime giúp bạn không chỉ fix CORS errors mà còn design secure APIs.

CORS không hoạt động ở network layer hay transport layer. Nó là một tầng bảo mật ở application layer, được implement bởi browsers để kiểm soát cross-origin access. Server express consent thông qua CORS headers, browser enforce policies đó. Postman và các HTTP clients khác không gặp CORS vì chúng không chạy trong browser security context.

Khi implement CORS, hãy balance giữa usability và security. Quá strict làm development khó khăn, quá permissive tạo security holes. Whitelist specific origins, validate requests properly, và test thoroughly ở tất cả environments. CORS errors thường là dấu hiệu rằng bạn đang làm đúng - browser đang protect users. Nhiệm vụ của developer là config properly để legitimate requests pass qua nhưng malicious requests bị block.

---

**Tham khảo:**

- MDN Web Docs: Same-Origin Policy & CORS
- OWASP CORS Security Cheat Sheet
- RFC 6454: The Web Origin Concept
- "Web Security Academy" - PortSwigger
