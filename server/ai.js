// Mô-đun AI Nhận diện Danh Thắng Du Lịch từ Hình Ảnh & Bộ Prompt Bìa Thực Tế Chuẩn Thị Trường
export const VIETNAM_LANDMARKS = [
  {
    id: 'hue',
    keywords: ['huế', 'hue', 'thừa thiên', 'kinh thành', 'đại nội', 'ngọ môn', 'thiên mụ', 'sông hương', 'lăng', 'cố đô'],
    landmark: 'Đại Nội & Chùa Thiên Mụ Huế',
    city: 'Huế',
    subtitle: 'Huế Thương Calling ...',
    tagline: 'CỐ ĐÔ TRẦM MẶC • DÒNG HƯƠNG GIANG THƠ MỘNG',
    details: 'Ngọ Môn Hoàng Thành cổ kính, tháp Phước Duyên chùa Thiên Mụ bên dòng sông Hương êm đềm và hoa sen hồng',
    prompt: 'scenic close-up view of Hue Imperial Citadel Ngo Mon gate and Thien Mu Pagoda beside calm Perfume River at golden hour, blooming pink lotus flowers in foreground, distant misty Truong Son mountains, clean modern gouache and watercolor landscape illustration, realistic proportions, warm imperial gold terracotta and jade tones, full bleed edge-to-edge painting, no frame, no border, no text, no letters, no watermark',
  },
  {
    id: 'nhatrang',
    keywords: ['nha trang', 'khánh hòa', 'hòn chồng', 'ponagar', 'bãi biển', 'cam ranh', 'vinpearl', 'hòn tre'],
    landmark: 'Vịnh Biển Nha Trang & Tháp Bà Ponagar',
    city: 'Nha Trang',
    subtitle: 'Nha Trang Calling ...',
    tagline: 'BIỂN XANH CÁT TRẮNG • NẮNG VÀNG RỰC RỠ',
    details: 'Bãi biển cát trắng mịn, hai cây dừa nghiêng bóng bên làn nước xanh ngọc bích và Tháp Bà Ponagar',
    prompt: 'sunny tropical beach in Nha Trang Bay Vietnam, two graceful curved coconut palm trees on golden sand beach, crystal clear turquoise ocean waves, distant green islands under bright blue sky with soft clouds, clean modern gouache and watercolor coastal landscape illustration, realistic proportions, fresh azure and warm sand tones, full bleed edge-to-edge painting, no frame, no border, no text, no letters, no watermark',
  },
  {
    id: 'hoian',
    keywords: ['hội an', 'quảng nam', 'chùa cầu', 'sông hoài', 'đèn lồng', 'phố cổ'],
    landmark: 'Phố Cổ Hội An & Chùa Cầu',
    city: 'Hội An',
    subtitle: 'Hội An Calling ...',
    tagline: 'PHỐ CỔ RÊU PHONG • ĐÊM HOA ĐĂNG LUNG LINH',
    details: 'Dãy nhà cổ tường vàng giàn hoa giấy đỏ thắm, Chùa Cầu lịch sử và thuyền gỗ trên sông Hoài',
    prompt: 'Hoi An ancient town yellow heritage shophouses with cascading vibrant pink bougainvillea flowers, historic Japanese Covered Bridge, wooden sampan boats on calm Hoai river with glowing lanterns at sunset, clean modern gouache and watercolor architectural landscape illustration, warm amber ochre and twilight blue, full bleed edge-to-edge painting, no frame, no border, no text, no letters, no watermark',
  },
  {
    id: 'dalat',
    keywords: ['đà lạt', 'lâm đồng', 'thông', 'xuân hương', 'langbiang', 'tuyền lâm', 'ga đà lạt', 'săn mây'],
    landmark: 'Đồi Thông Sương Mù & Ga Đà Lạt',
    city: 'Đà Lạt',
    subtitle: 'Đà Lạt Calling ...',
    tagline: 'THÀNH PHỐ NGÀN HOA • SƯƠNG SỚM ĐỒI THÔNG',
    details: 'Rừng thông xanh mướt trong sương sớm, kiến trúc Pháp cổ điển và hoa dã quỳ vàng rực rỡ',
    prompt: 'Da Lat misty pine tree forest hills at sunrise, charming French colonial villa and historic railway station among blooming yellow wild sunflowers, peaceful Xuan Huong lake reflection, clean modern gouache and watercolor highland landscape illustration, pine green and warm morning sunlight, full bleed edge-to-edge painting, no frame, no border, no text, no letters, no watermark',
  },
  {
    id: 'danang',
    keywords: ['đà nẵng', 'bà nà', 'cầu rồng', 'cầu vàng', 'sơn trà', 'mỹ khê', 'hàn'],
    landmark: 'Cầu Vàng Bà Nà & Biển Đà Nẵng',
    city: 'Đà Nẵng',
    subtitle: 'Đà Nẵng Calling ...',
    tagline: 'THÀNH PHỐ ĐÁNG SỐNG • NHỊP CẦU VƯƠN XA',
    details: 'Cầu Vàng trên đỉnh Bà Nà mờ sương, Cầu Rồng bên sông Hàn và bãi biển Mỹ Khê quyến rũ',
    prompt: 'iconic Golden Bridge held by giant weathered stone hands high in misty green mountains of Ba Na Hills Da Nang, lush tropical forest and sunny sky with soft clouds, clean modern gouache and watercolor landscape illustration, realistic architecture, warm gold and emerald green, full bleed edge-to-edge painting, no frame, no border, no text, no letters, no watermark',
  },
  {
    id: 'sapa',
    keywords: ['sa pa', 'sapa', 'lào cai', 'fansipan', 'ruộng bậc thang', 'mù cang chải', 'y tý', 'bản cát cát'],
    landmark: 'Ruộng Bậc Thang & Đỉnh Fansipan Sa Pa',
    city: 'Sa Pa',
    subtitle: 'Sa Pa Calling ...',
    tagline: 'MÂY NGÀN TÂY BẮC • MÙA VÀNG TRÊN RẺO CAO',
    details: 'Ruộng bậc thang lúa chín vàng óng uốn lượn quanh sườn núi hùng vĩ và biển mây Fansipan',
    prompt: 'majestic cascading golden terraced rice fields in Sa Pa valleys, rustic wooden mountain huts, towering Fansipan peak above sea of white clouds at sunrise, clean modern gouache and watercolor mountain landscape illustration, vibrant harvest gold and lush green tones, full bleed edge-to-edge painting, no frame, no border, no text, no letters, no watermark',
  },
  {
    id: 'halong',
    keywords: ['hạ long', 'quảng ninh', 'bái tử long', 'vịnh hạ long', 'đảo ti tốp', 'cát bà', 'lan hạ'],
    landmark: 'Kỳ Quan Vịnh Hạ Long',
    city: 'Hạ Long',
    subtitle: 'Hạ Long Calling ...',
    tagline: 'KỲ QUAN THIÊN NHIÊN • BIỂN ĐẢO NGỌC BÍCH',
    details: 'Hàng nghìn đảo đá vôi kỳ vĩ nhấp nhô giữa làn nước xanh ngọc bích và du thuyền lướt êm',
    prompt: 'spectacular Ha Long Bay towering limestone karst islands covered in green foliage rising from calm emerald turquoise sea, traditional wooden sailboat gliding on water at golden sunset, clean modern gouache and watercolor seascape illustration, jade teal and warm sunset gold, full bleed edge-to-edge painting, no frame, no border, no text, no letters, no watermark',
  },
  {
    id: 'hanoi',
    keywords: ['hà nội', 'hồ gươm', 'tháp rùa', 'phố cổ hà nội', 'ba đình', 'chùa một cột', 'cầu long biên', 'hồ tây'],
    landmark: 'Tháp Rùa Hồ Gươm & Mùa Thu Hà Nội',
    city: 'Hà Nội',
    subtitle: 'Hà Nội Calling ...',
    tagline: 'NGÀN NĂM VĂN HIẾN • NỒNG NÀN MÙA THU',
    details: 'Tháp Rùa trầm mặc giữa mặt hồ Hoàn Kiếm, cầu Thê Húc đỏ son và hàng cây mùa thu lá vàng',
    prompt: 'Hanoi Hoan Kiem Lake with historic Turtle Tower and red The Huc Bridge surrounded by golden autumn foliage and weeping willow trees, vintage bicycle with fresh flowers by lakeside, clean modern gouache and watercolor landscape illustration, warm autumn amber and emerald lake tones, full bleed edge-to-edge painting, no frame, no border, no text, no letters, no watermark',
  },
  {
    id: 'phuquoc',
    keywords: ['phú quốc', 'kiên giang', 'bãi sao', 'hòn thơm', 'hòn mây rút', 'hoàng hôn', 'cáp treo'],
    landmark: 'Đảo Ngọc Phú Quốc & Hoàng Hôn Bãi Sao',
    city: 'Phú Quốc',
    subtitle: 'Phú Quốc Calling ...',
    tagline: 'THIÊN ĐƯỜNG ĐẢO NGỌC • HOÀNG HÔN RỰC RỠ',
    details: 'Bãi Sao cát trắng mịn, hàng dừa nhiệt đới nghiêng mình và ráng chiều hoàng hôn tím hồng trên biển',
    prompt: 'Phu Quoc Island tropical paradise beach at sunset, leaning coconut palm trees over pristine white sand, calm turquoise water reflecting glowing peach and violet sunset sky, wooden boat near shore, clean modern gouache and watercolor coastal illustration, full bleed edge-to-edge painting, no frame, no border, no text, no letters, no watermark',
  },
  {
    id: 'ninhbinh',
    keywords: ['ninh bình', 'tràng an', 'tam cốc', 'bích động', 'hang múa', 'bái đính', 'hoa lư'],
    landmark: 'Danh Thắng Tràng An & Đỉnh Hang Múa',
    city: 'Ninh Bình',
    subtitle: 'Ninh Bình Calling ...',
    tagline: 'NON NƯỚC HỮU TÌNH • MIỀN DI SẢN CỐ ĐÔ',
    details: 'Thuyền nan lững lờ trôi trên dòng Ngô Đồng lúa chín vàng giữa những dãy núi đá vôi Tràng An',
    prompt: 'Ninh Binh Trang An and Tam Coc scenic river winding between dramatic green limestone karst mountains and golden rice fields, wooden rowboat on crystal water with blooming pink lotus, clean modern gouache and watercolor landscape illustration, emerald green and warm gold tones, full bleed edge-to-edge painting, no frame, no border, no text, no letters, no watermark',
  },
  {
    id: 'saigon',
    keywords: ['sài gòn', 'hồ chí minh', 'bến thành', 'nhà thờ đức bà', 'bưu điện', 'bến bạch đằng'],
    landmark: 'Nhà Thờ Đức Bà & Bưu Điện Sài Gòn',
    city: 'Sài Gòn',
    subtitle: 'Sài Gòn Calling ...',
    tagline: 'THÀNH PHỐ NĂNG ĐỘNG • NHỊP SỐNG PHỒN HOA',
    details: 'Bưu điện Trung tâm Sài Gòn cổ kính, Nhà thờ Đức Bà và nắng vàng rực rỡ qua hàng cây xanh',
    prompt: 'Saigon Central Post Office and Notre Dame Cathedral historic architecture under sunny blue sky, green street trees, vintage scooter by charming sidewalk cafe in morning sunlight, clean modern gouache and watercolor urban landscape illustration, warm yellow ochre and terracotta tones, full bleed edge-to-edge painting, no frame, no border, no text, no letters, no watermark',
  },
  {
    id: 'hagiang',
    keywords: ['hà giang', 'mã pí lèng', 'nho quế', 'lũng cú', 'hoa tam giác mạch', 'đồng văn', 'mèo vạc'],
    landmark: 'Đèo Mã Pí Lèng & Sông Nho Quế Hà Giang',
    city: 'Hà Giang',
    subtitle: 'Hà Giang Calling ...',
    tagline: 'CAO NGUYÊN ĐÁ NỞ HOA • ĐỈNH ĐÈO HÙNG VĨ',
    details: 'Hẻm vực Tu Sản kỳ vĩ, dòng sông Nho Quế xanh ngọc bích và triền hoa tam giác mạch hồng phấn',
    prompt: 'Ha Giang Ma Pi Leng mountain pass overlooking deep Tu San canyon and emerald turquoise Nho Que River, blooming pink buckwheat flowers in foreground, majestic karst mountain peaks, clean modern gouache and watercolor landscape illustration, teal cyan and warm earth tones, full bleed edge-to-edge painting, no frame, no border, no text, no letters, no watermark',
  },
  {
    id: 'vungtau',
    keywords: ['vũng tàu', 'côn đảo', 'bà rịa', 'hồ tràm', 'lý sơn', 'phú quý', 'quy nhơn', 'eo gió', 'kỳ co', 'mũi né', 'phan thiết'],
    landmark: 'Hải Đăng Biển Đảo & Cung Đường Ven Biển',
    city: 'Biển Đảo',
    subtitle: 'Ocean Calling ...',
    tagline: 'GIÓ BIỂN RÌ RÀO • CHÂN TRỜI TỰ DO',
    details: 'Ngọn hải đăng trắng vươn mình trước đại dương xanh biếc, ghềnh đá và sóng vỗ bờ cát vàng',
    prompt: 'scenic coastal cliff and white lighthouse overlooking deep blue ocean waves, sunny coastal road with blooming bougainvillea and palm trees, turquoise bay below, clean modern gouache and watercolor seascape illustration, azure blue and sunlit warm tones, full bleed edge-to-edge painting, no frame, no border, no text, no letters, no watermark',
  },
];

/**
 * Nhận diện địa danh từ hình ảnh bằng Google Gemini Vision (nếu có key)
 * hoặc hệ thống phân tích danh thắng du lịch thông minh
 */
export async function recognizeLandmark({ photoUrl, locationHint = '', albumTitle = '' }) {
  const geminiKey = process.env.GEMINI_API_KEY;

  // 1. Thử nhận diện bằng Gemini Flash Vision nếu có API Key
  if (geminiKey && photoUrl) {
    try {
      const imgRes = await fetch(photoUrl);
      if (imgRes.ok) {
        const buffer = await imgRes.arrayBuffer();
        const base64 = Buffer.from(buffer).toString('base64');
        const mimeType = imgRes.headers.get('content-type') || 'image/jpeg';

        const promptText = `Bạn là chuyên gia thẩm định du lịch Việt Nam và thế giới. Hãy quan sát kỹ bức ảnh này và cho biết:
1. Đây là địa danh, di tích, thắng cảnh hoặc cảnh quan du lịch cụ thể nào (ví dụ: Đại Nội Huế, Chùa Thiên Mụ, Cầu Vàng Bà Nà, Bãi biển Nha Trang, Phố cổ Hội An, Đồi thông Đà Lạt, Tháp Rùa Hồ Gươm, Vịnh Hạ Long, Đèo Mã Pí Lèng...)?
2. Thuộc thành phố/tỉnh nào?
3. Mô tả ngắn 1 câu những nét đẹp kiến trúc hoặc phong cảnh đặc sắc nhất.
4. Viết 1 prompt tiếng Anh ngắn (khoảng 30-40 từ) miêu tả CẢNH QUAN THỰC TẾ trong ảnh để AI vẽ tranh phong cảnh tràn viền (LƯU Ý QUAN TRỌNG: TUYỆT ĐỐI KHÔNG dùng từ "poster", "card", "banner" trong prompt để tránh AI tự vẽ khung viền và chữ giả). Hãy dùng phong cách: "clean modern gouache and watercolor scenic landscape illustration, realistic proportions, warm natural lighting, full bleed edge-to-edge painting, no frame, no border, no text, no letters, no watermark".

Gợi ý ngữ cảnh thêm từ album: "${albumTitle} - ${locationHint}".
Trả về duy nhất định dạng JSON thuần không bọc markdown:
{"landmark": "Tên địa danh cụ thể", "city": "Tên thành phố/tỉnh", "details": "Mô tả chi tiết", "prompt": "prompt tiếng Anh vẽ cảnh quan tràn viền không khung không chữ"}`;

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
        id: item.id,
        landmark: item.landmark,
        city: item.city,
        subtitle: item.subtitle,
        tagline: item.tagline,
        details: item.details,
        prompt: item.prompt,
        detectedBy: 'smart_travel_knowledge',
      };
    }
  }

  // Mặc định tổng quát nếu không khớp danh thắng cụ thể
  const defaultCity = locationHint.split(',')[0]?.trim() || albumTitle || 'Việt Nam';
  return {
    id: 'default',
    landmark: `Thắng Cảnh ${defaultCity}`,
    city: defaultCity,
    subtitle: `${defaultCity} Calling ...`,
    tagline: 'KỶ NIỆM HÀNH TRÌNH • CHUYẾN ĐI ĐÁNG NHỚ',
    details: `Khung cảnh thiên nhiên và kiến trúc đặc trưng tại ${defaultCity}`,
    prompt: `scenic panoramic landscape view of ${defaultCity} Vietnam iconic nature and architecture at golden hour, clean modern gouache and watercolor landscape illustration, realistic proportions, warm natural colors, full bleed edge-to-edge painting, no frame, no border, no text, no letters, no watermark`,
    detectedBy: 'smart_travel_knowledge',
  };
}
