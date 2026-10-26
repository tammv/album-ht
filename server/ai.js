// Mô-đun AI Nhận diện Danh Thắng Du Lịch từ Hình Ảnh
const VIETNAM_LANDMARKS = [
  {
    keywords: ['huế', 'hue', 'thừa thiên', 'kinh thành', 'đại nội', 'ngọ môn', 'thiên mụ', 'sông hương', 'lăng'],
    landmark: 'Đại Nội & Chùa Thiên Mụ',
    city: 'Huế',
    details: 'Cố đô cổ kính với Ngọ Môn, tháp Phước Duyên 7 tầng ven bờ sông Hương và hoa sen',
    prompt: 'Hue ancient imperial citadel palace gate and Thien Mu pagoda pagoda with lotus flowers on Perfume river, minimalist retro doodle line art, risograph vintage travel poster style, clean navy blue and terracotta lines, cute aesthetic',
  },
  {
    keywords: ['nha trang', 'khánh hòa', 'hòn chồng', 'ponagar', 'bãi biển', 'cam ranh'],
    landmark: 'Bãi Biển Nha Trang & Tháp Bà Ponagar',
    city: 'Nha Trang',
    details: 'Bãi biển cát vàng, hai cây dừa biển nhiệt đới nghiêng bóng và cụm tháp Chăm cổ kính',
    prompt: 'two tropical palm trees waving on Nha Trang beach with ocean waves and sunny breeze, Po Nagar Cham towers silhouette, minimalist retro blue doodle line art, vintage travel poster style, cute aesthetic',
  },
  {
    keywords: ['hội an', 'quảng nam', 'chùa cầu', 'sông hoài', 'đèn lồng', 'phố cổ'],
    landmark: 'Phố Cổ Hội An & Chùa Cầu',
    city: 'Hội An',
    details: 'Dãy nhà cổ tường vàng hoa giấy, Chùa Cầu lịch sử và dòng sông Hoài hoa đăng',
    prompt: 'Hoi An ancient town yellow wall shop houses with blooming bougainvillea flowers, iconic Japanese covered bridge, floating colorful lanterns on river, minimalist doodle travel poster, cute retro line art',
  },
  {
    keywords: ['đà nẵng', 'bà nà', 'cầu rồng', 'cầu vàng', 'sơn trà', 'mỹ khê'],
    landmark: 'Cầu Rồng & Cầu Vàng Bà Nà Hills',
    city: 'Đà Nẵng',
    details: 'Cầu Rồng phun lửa qua sông Hàn và Bàn tay khổng lồ nâng đỡ Cầu Vàng trên đỉnh mây',
    prompt: 'giant stone hands holding the Golden Bridge in misty green mountains of Ba Na hills and Da Nang dragon bridge, minimalist retro travel doodle line art, vintage risograph poster aesthetic',
  },
  {
    keywords: ['đà lạt', 'lâm đồng', 'thông', 'xuân hương', 'langbiang', 'tuyền lâm', 'ga đà lạt'],
    landmark: 'Đồi Thông Sương Mù & Hồ Xuân Hương',
    city: 'Đà Lạt',
    details: 'Rừng thông cao vút thoai thoải trong sương sớm, ga xe lửa cổ kính và ngàn hoa khoe sắc',
    prompt: 'Da Lat misty pine tree hills, vintage french style train station, blooming hydrangeas flowers, cute couple walking in romantic chill breeze, retro doodle travel poster, minimalist green and rose line art',
  },
  {
    keywords: ['sa pa', 'sapa', 'lào cai', 'fansipan', 'ruộng bậc thang', 'mù cang chải', 'y tý'],
    landmark: 'Ruộng Bậc Thang & Đỉnh Fansipan',
    city: 'Sa Pa',
    details: 'Ruộng bậc thang vàng óng uốn lượn quanh sườn núi hùng vĩ, cáp treo xuyên mây ngút ngàn',
    prompt: 'golden layered terraced rice fields cascading down misty mountains with cute cable car ascending to Fansipan peak, ethnic brocade patterns, minimalist retro travel doodle line art, vintage poster',
  },
  {
    keywords: ['hạ long', 'quảng ninh', 'bái đửng', 'vịnh hạ long', 'đảo ti tốp'],
    landmark: 'Kỳ Quan Vịnh Hạ Long',
    city: 'Hạ Long',
    details: 'Hàng nghìn đảo đá vôi nhấp nhô giữa làn nước xanh ngọc bích, cánh buồm nâu lướt êm',
    prompt: 'Halong bay limestone karst islands rising from emerald waters, traditional junk boat with brown wooden sails, flying sea birds, minimalist retro doodle line art, teal and navy risograph travel poster',
  },
  {
    keywords: ['hà nội', 'hồ gươm', 'tháp rùa', 'phố cổ hà nội', 'ba đình', 'chùa một cột', 'cầu long biên'],
    landmark: 'Tháp Rùa Hồ Gươm & Phố Cổ 36 Phố Phường',
    city: 'Hà Nội',
    details: 'Tháp Rùa trầm mặc giữa mặt hồ trong xanh, cầu Long Biên rêu phong và xe đạp chở hoa mùa thu',
    prompt: 'Hanoi Turtle Tower on Sword Lake with weeping willow trees, vintage bicycle carrying autumn flowers, ancient Long Bien bridge, minimalist retro doodle travel poster, nostalgic line art',
  },
  {
    keywords: ['phú quốc', 'kiên giang', 'bãi sao', 'hòn thơm', 'hòn mây rút', 'hoàng hôn'],
    landmark: 'Hoàng Hôn Bãi Sao Phú Quốc',
    city: 'Phú Quốc',
    details: 'Biển xanh ngọc bích trong vắt, cây dừa xích đu và ráng chiều hoàng hôn rực rỡ',
    prompt: 'Phu Quoc island tropical beach, white sand, wooden swing on bent palm tree over crystal clear turquoise water, gorgeous sunset horizon, minimalist retro doodle line art, cute travel poster',
  },
  {
    keywords: ['sài gòn', 'hồ chí minh', 'bến thành', 'nhà thờ đức bà', 'bưu điện'],
    landmark: 'Chợ Bến Thành & Nhà Thờ Đức Bà',
    city: 'TP. Hồ Chí Minh',
    details: 'Tháp đồng hồ Chợ Bến Thành biểu tượng, chim bồ câu bay rợp trời trước vương cung thánh đường',
    prompt: 'Saigon Ben Thanh market clock tower, doves flying around Notre Dame Cathedral, bustling vintage city streets, minimalist retro travel doodle line art, vibrant clean vector poster',
  },
  {
    keywords: ['ninh bình', 'tràng an', 'tam cốc', 'bích động', 'hang múa'],
    landmark: 'Danh Thắng Tràng An & Hang Múa',
    city: 'Ninh Bình',
    details: 'Thuyền nan lững lờ trôi qua hang động đá vôi kỳ vĩ và dòng sông Ngô Đồng lúa chín vàng',
    prompt: 'Trang An Ninh Binh peaceful river boat cruising between towering limestone cliffs, yellow rice paddies, lotus blossoms, minimalist retro doodle travel poster, cute green and terracotta line art',
  },
  {
    keywords: ['hà giang', 'mã pí lèng', 'nho quế', 'lũng cú', 'hoa tam giác mạch'],
    landmark: 'Đèo Mã Pí Lèng & Dòng Sông Nho Quế',
    city: 'Hà Giang',
    details: 'Hẻm vực Tu Sản sâu nhất Đông Nam Á, dòng Nho Quế xanh ngọc bích uốn lượn dưới chân đèo',
    prompt: 'Ha Giang spectacular Ma Pi Leng pass overlooking winding emerald Nho Que river canyon, buckwheat flowers, minimalist retro travel doodle line art, epic mountain landscape, cute risograph poster',
  },
];

/**
 * Nhận diện địa danh từ hình ảnh bằng Google Gemini Vision (nếu có key)
 * hoặc hệ thống phân tích danh thắng du lịch thông minh
 */
export async function recognizeLandmark({ photoUrl, locationHint = '', albumTitle = '' }) {
  const geminiKey = process.env.GEMINI_API_KEY;

  // 1. Thử nhận diện bằng Gemini 1.5 Flash Vision nếu có API Key
  if (geminiKey && photoUrl) {
    try {
      // Tải ảnh về buffer để gửi inline sang Gemini
      const imgRes = await fetch(photoUrl);
      if (imgRes.ok) {
        const buffer = await imgRes.arrayBuffer();
        const base64 = Buffer.from(buffer).toString('base64');
        const mimeType = imgRes.headers.get('content-type') || 'image/jpeg';

        const promptText = `Bạn là chuyên gia thẩm định du lịch và văn hóa Việt Nam cũng như thế giới. Hãy quan sát kỹ bức ảnh này và cho biết:
1. Đây là địa danh, di tích, thắng cảnh hoặc cảnh quan du lịch cụ thể nào (ví dụ: Chùa Thiên Mụ, Cầu Vàng Bà Nà, Tháp Trầm Hương Nha Trang, Đại Nội Huế, Chùa Cầu Hội An, Đồi thông Đà Lạt, Tháp Rùa, Đèo Mã Pí Lèng...)?
2. Thuộc thành phố/tỉnh nào?
3. Mô tả ngắn 1 câu những chi tiết kiến trúc hoặc tự nhiên nổi bật nhất trong ảnh.
4. Viết 1 prompt tiếng Anh ngắn (khoảng 20-30 từ) miêu tả các biểu tượng trên để vẽ tranh minh họa phong cách "minimalist retro doodle line art, risograph vintage travel poster style, cute aesthetic, no text".

Gợi ý ngữ cảnh thêm từ album: "${albumTitle} - ${locationHint}".
Trả về duy nhất định dạng JSON thuần không bọc markdown:
{"landmark": "Tên địa danh/di tích cụ thể", "city": "Tên thành phố/tỉnh", "details": "Mô tả chi tiết nổi bật", "prompt": "prompt tiếng Anh để vẽ tranh doodle"}`;

        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    { text: promptText },
                    { inline_data: { mime_type: mimeType, data: base64 } },
                  ],
                },
              ],
              generationConfig: { response_mime_type: 'application/json' },
            }),
          }
        );

        if (geminiRes.ok) {
          const data = await geminiRes.json();
          const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            const parsed = JSON.parse(text);
            return {
              ...parsed,
              detectedBy: 'gemini_vision',
            };
          }
        }
      }
    } catch (e) {
      console.warn('Lỗi gọi Gemini Vision, chuyển sang bộ nhận diện thông minh:', e.message);
    }
  }

  // 2. Bộ phân tích danh thắng du lịch thông minh (Smart Landmark Matcher)
  const searchText = `${locationHint} ${albumTitle}`.toLowerCase();
  for (const item of VIETNAM_LANDMARKS) {
    if (item.keywords.some((kw) => searchText.includes(kw))) {
      return {
        landmark: item.landmark,
        city: item.city,
        details: item.details,
        prompt: item.prompt,
        detectedBy: 'smart_travel_knowledge',
      };
    }
  }

  // Mặc định tổng quát nếu không khớp danh thắng cụ thể
  const defaultCity = locationHint.split(',')[0] || albumTitle || 'Việt Nam';
  return {
    landmark: `${defaultCity} Yêu Thương`,
    city: defaultCity,
    details: `Khung cảnh kỷ niệm tuyệt đẹp tại ${defaultCity}`,
    prompt: `minimalist travel doodle illustration of ${defaultCity} landmarks and scenery, romantic cute couple vibes, risograph retro travel poster aesthetic, clean line art, high quality`,
    detectedBy: 'smart_travel_knowledge',
  };
}
