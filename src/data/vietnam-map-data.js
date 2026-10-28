import { PROVINCE_SHAPES } from './province-shapes.js';

/**
 * Bỏ dấu tiếng Việt để so khớp từ khóa chính xác dù người dùng gõ có dấu hay không dấu
 */
export function stripVn(str = '') {
  return String(str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
}

/**
 * Thông tin Địa danh biểu tượng 3D & Vùng miền của 34 tỉnh/thành Việt Nam (sau sáp nhập 01/07/2025)
 * Tham khảo dữ liệu từ holetexvn/vietnam-3d-map & tinypomelo/vietnam-interactive-map
 */
export const PROVINCE_META = {
  'Hà Nội': {
    region: 'Đồng bằng sông Hồng',
    landmarkTitle: 'Khuê Văn Các – Hồ Gươm',
    landmarkDesc: 'Biểu tượng ngàn năm văn hiến bên Tháp Rùa và Văn Miếu Quốc Tử Giám',
    icon: 'fa-landmark-dome',
    color: '#e11d48',
    keywords: ['hà nội', 'hồ gươm', 'hoàn kiếm', 'tây hồ', 'ba vì', 'sóc sơn', 'đường lâm', 'lăng bác'],
  },
  'Hải Phòng': {
    region: 'Đồng bằng sông Hồng',
    landmarkTitle: 'Đảo Cát Bà & Cảng Hải Phòng',
    landmarkDesc: 'Quần đảo Cát Bà xanh biếc, Đồ Sơn và vùng văn hóa Xứ Đông (Hải Dương cũ)',
    icon: 'fa-anchor',
    color: '#0284c7',
    keywords: ['hải phòng', 'hải dương', 'cát bà', 'lan hạ', 'đồ sơn', 'côn sơn', 'kiếp bạc', 'bạch long vĩ'],
  },
  'Quảng Ninh': {
    region: 'Đông Bắc Bộ',
    landmarkTitle: 'Di sản Vịnh Hạ Long',
    landmarkDesc: 'Kỳ quan hàng nghìn đảo đá vôi giữa biển xanh, non thiêng Yên Tử và đảo Cô Tô',
    icon: 'fa-sailboat',
    color: '#0ea5e9',
    keywords: ['quảng ninh', 'hạ long', 'yên tử', 'cô tô', 'vân đồn', 'bình liêu', 'móng cái', 'bãi cháy', 'tuần châu'],
  },
  'Bắc Ninh': {
    region: 'Đồng bằng sông Hồng',
    landmarkTitle: 'Đình làng Quan họ Kinh Bắc',
    landmarkDesc: 'Mái đình cổ kính và câu hát giao duyên Quan họ di sản UNESCO (Bắc Ninh + Bắc Giang)',
    icon: 'fa-music',
    color: '#d97706',
    keywords: ['bắc ninh', 'bắc giang', 'kinh bắc', 'chùa dâu', 'chùa bút tháp', 'tây yên tử', 'cấm sơn'],
  },
  'Hưng Yên': {
    region: 'Đồng bằng sông Hồng',
    landmarkTitle: 'Phố Hiến & Biển Vô Cực',
    landmarkDesc: 'Thứ nhất Kinh Kỳ, thứ nhì Phố Hiến cùng biển Cồn Vành, chùa Keo (Thái Bình cũ)',
    icon: 'fa-torii-gate',
    color: '#f59e0b',
    keywords: ['hưng yên', 'thái bình', 'phố hiến', 'chùa keo', 'cồn vành', 'cồn đen', 'đồng châu', 'ecopark'],
  },
  'Ninh Bình': {
    region: 'Đồng bằng sông Hồng',
    landmarkTitle: 'Quần thể danh thắng Tràng An',
    landmarkDesc: 'Vịnh Hạ Long trên cạn, Tam Cốc, Hang Múa, chùa Tam Chúc (Hà Nam) & Phủ Dầy (Nam Định)',
    icon: 'fa-mountain-sun',
    color: '#10b981',
    keywords: ['ninh bình', 'hà nam', 'nam định', 'tràng an', 'tam cốc', 'bích động', 'hang múa', 'bái đính', 'cố đô hoa lư', 'cúc phương', 'tam chúc', 'giao thủy', 'quất lâm', 'hải hậu'],
  },
  'Tuyên Quang': {
    region: 'Đông Bắc Bộ',
    landmarkTitle: 'Cột cờ Lũng Cú – Cao nguyên đá Đồng Văn',
    landmarkDesc: 'Nơi địa đầu Tổ quốc Hà Giang (nay hợp nhất Tuyên Quang): Mã Pí Lèng, sông Nho Quế, Na Hang',
    icon: 'fa-flag',
    color: '#059669',
    keywords: ['tuyên quang', 'hà giang', 'đồng văn', 'mèo vạc', 'mã pí lèng', 'nho quế', 'lũng cú', 'hoàng su phì', 'quản bạ', 'yên minh', 'du già', 'na hang', 'tân trào'],
  },
  'Cao Bằng': {
    region: 'Đông Bắc Bộ',
    landmarkTitle: 'Thác Bản Giốc – Suối Lê Nin',
    landmarkDesc: 'Thác nước biên giới hùng vĩ bậc nhất Việt Nam trên dòng sông Quây Sơn ngọc bích',
    icon: 'fa-water',
    color: '#14b8a6',
    keywords: ['cao bằng', 'bản giốc', 'pác bó', 'suối lê nin', 'ngườm ngao', 'núi mắt thần', 'trùng khánh'],
  },
  'Lạng Sơn': {
    region: 'Đông Bắc Bộ',
    landmarkTitle: 'Đỉnh Mẫu Sơn & Thung lũng Bắc Sơn',
    landmarkDesc: 'Núi Tô Thị vọng phu, đỉnh Mẫu Sơn săn băng tuyết và thung lũng lúa vàng Bắc Sơn',
    icon: 'fa-cloud-sun',
    color: '#6366f1',
    keywords: ['lạng sơn', 'mẫu sơn', 'bắc sơn', 'đồng đăng', 'hữu lũng', 'nàng tô thị', 'nhị thanh'],
  },
  'Thái Nguyên': {
    region: 'Đông Bắc Bộ',
    landmarkTitle: 'Hồ Ba Bể & Đồi chè Tân Cương',
    landmarkDesc: 'Viên ngọc xanh Hồ Ba Bể (Bắc Kạn cũ) hòa quyện cùng đệ nhất danh trà Tân Cương',
    icon: 'fa-leaf',
    color: '#22c55e',
    keywords: ['thái nguyên', 'bắc kạn', 'ba bể', 'hồ ba bể', 'hồ núi cốc', 'tân cương', 'pác ngòi'],
  },
  'Lào Cai': {
    region: 'Tây Bắc Bộ',
    landmarkTitle: 'Đỉnh Fansipan & Ruộng bậc thang Mù Cang Chải',
    landmarkDesc: 'Nóc nhà Đông Dương 3.143m tại Sa Pa cùng sóng lúa vàng Mù Cang Chải, Trạm Tấu (Yên Bái cũ)',
    icon: 'fa-mountain',
    color: '#8b5cf6',
    keywords: ['lào cai', 'yên bái', 'sa pa', 'sapa', 'fansipan', 'bản cát cát', 'y tý', 'bắc hà', 'mù cang chải', 'trạm tấu', 'tà xùa yên bái', 'hồ thác bà', 'tú lệ', 'khau phạ'],
  },
  'Lai Châu': {
    region: 'Tây Bắc Bộ',
    landmarkTitle: 'Đèo Ô Quy Hồ – Tứ đại đỉnh đèo',
    landmarkDesc: 'Cung đèo mây phủ quanh năm nối liền Lai Châu – Sa Pa và bản Sin Suối Hồ',
    icon: 'fa-wind',
    color: '#a855f7',
    keywords: ['lai châu', 'ô quy hồ', 'sin suối hồ', 'bạch mộc lương tử', 'putaleng', 'sìn hồ'],
  },
  'Điện Biên': {
    region: 'Tây Bắc Bộ',
    landmarkTitle: 'Chiến trường Điện Biên Phủ – Đèo Pha Đin',
    landmarkDesc: 'Miền hoa ban trắng lịch sử, cánh đồng Mường Thanh và cực Tây A Pa Chải',
    icon: 'fa-monument',
    color: '#ec4899',
    keywords: ['điện biên', 'điện biên phủ', 'pha đin', 'mường thanh', 'a pa chải', 'hồ pá khoang', 'mường nhé'],
  },
  'Sơn La': {
    region: 'Tây Bắc Bộ',
    landmarkTitle: 'Cao nguyên Mộc Châu & Sống lưng khủng long Tà Xùa',
    landmarkDesc: 'Thiên đường săn mây Tà Xùa và mùa hoa mận, đồi chè trái tim Mộc Châu',
    icon: 'fa-cloud',
    color: '#10b981',
    keywords: ['sơn la', 'mộc châu', 'tà xùa', 'pha luông', 'bắc yên', 'ngọc chiến', 'cầu kính bạch long'],
  },
  'Phú Thọ': {
    region: 'Tây Bắc Bộ',
    landmarkTitle: 'Đền Hùng – Tam Đảo – Thung lũng Mai Châu',
    landmarkDesc: 'Đất Tổ Vua Hùng hội tụ cùng thị trấn sương mù Tam Đảo (Vĩnh Phúc) & bản làng Mai Châu (Hòa Bình)',
    icon: 'fa-gopuram',
    color: '#f97316',
    keywords: ['phú thọ', 'vĩnh phúc', 'hòa bình', 'hoà bình', 'đền hùng', 'tam đảo', 'đại lải', 'tây thiên', 'mai châu', 'pù luông hòa bình', 'thung nai', 'kim bôi', 'đà bắc', 'xuân sơn'],
  },
  'Thanh Hóa': {
    region: 'Bắc Trung Bộ',
    landmarkTitle: 'Khu bảo tồn Pù Luông & Thành Nhà Hồ',
    landmarkDesc: 'Ruộng bậc thang Pù Luông bình yên, biển Sầm Sơn, Hải Tiến và di sản Thành Nhà Hồ',
    icon: 'fa-fort-awesome',
    color: '#eab308',
    keywords: ['thanh hóa', 'thanh hoá', 'pù luông', 'sầm sơn', 'hải tiến', 'bãi đông', 'nghi sơn', 'thành nhà hồ', 'suối cá thần'],
  },
  'Nghệ An': {
    region: 'Bắc Trung Bộ',
    landmarkTitle: 'Làng Sen Quê Bác & Đồi chè Thanh Chương',
    landmarkDesc: 'Quê hương Chủ tịch Hồ Chí Minh, biển Cửa Lò và cổng trời Mường Lống',
    icon: 'fa-spa',
    color: '#f43f5e',
    keywords: ['nghệ an', 'vinh', 'cửa lò', 'làng sen', 'kim liên', 'thanh chương', 'pù mát', 'mường lống', 'kỳ sơn'],
  },
  'Hà Tĩnh': {
    region: 'Bắc Trung Bộ',
    landmarkTitle: 'Biển Thiên Cầm & Chùa Hương Tích',
    landmarkDesc: 'Cung đàn biển Thiên Cầm trong xanh, Ngã ba Đồng Lộc và hồ Kẻ Gỗ',
    icon: 'fa-umbrella-beach',
    color: '#06b6d4',
    keywords: ['hà tĩnh', 'thiên cầm', 'đồng lộc', 'hương tích', 'kẻ gỗ', 'xuân thành'],
  },
  'Quảng Trị': {
    region: 'Bắc Trung Bộ',
    landmarkTitle: 'Di sản Phong Nha Kẻ Bàng & Cầu Hiền Lương',
    landmarkDesc: 'Vương quốc hang động Sơn Đoòng, Phong Nha, biển Nhật Lệ (Quảng Bình cũ) & Thành cổ Quảng Trị',
    icon: 'fa-mountain-city',
    color: '#0284c7',
    keywords: ['quảng trị', 'quảng bình', 'phong nha', 'kẻ bàng', 'sơn đoòng', 'động thiên đường', 'suối moọc', 'nhật lệ', 'đồng hới', 'bảo ninh', 'vũng chùa', 'đảo yến', 'cồn cỏ', 'khe sanh', 'hiền lương'],
  },
  'Huế': {
    region: 'Duyên hải Miền Trung',
    landmarkTitle: 'Đại Nội Kinh Thành Huế – Chùa Thiên Mụ',
    landmarkDesc: 'Cố đô trầm mặc bên dòng sông Hương, cầu Trường Tiền, lăng tẩm triều Nguyễn & vịnh Lăng Cô',
    icon: 'fa-yin-yang',
    color: '#9333ea',
    keywords: ['huế', 'hue', 'thừa thiên huế', 'cố đô', 'đại nội', 'sông hương', 'thiên mụ', 'trường tiền', 'lăng cô', 'bạch mã', 'phá tam giang', 'làng hương thủy xuân', 'an định', 'minh mạng', 'khải định', 'tự đức'],
  },
  'Đà Nẵng': {
    region: 'Duyên hải Miền Trung',
    landmarkTitle: 'Cầu Vàng Bà Nà & Phố Cổ Hội An',
    landmarkDesc: 'Thành phố đáng sống hợp nhất cùng xứ Quảng: Cầu Rồng, Sơn Trà, Phố cổ Hội An, Cù Lao Chàm & QĐ. Hoàng Sa',
    icon: 'fa-bridge-water',
    color: '#e11d48',
    keywords: ['đà nẵng', 'quảng nam', 'hội an', 'bà nà', 'cầu vàng', 'cầu rồng', 'sơn trà', 'mỹ khê', 'ngũ hành sơn', 'cù lao chàm', 'mỹ sơn', 'tam thanh', 'rừng dừa bảy mẫu', 'an bàng', 'hoàng sa'],
  },
  'Quảng Ngãi': {
    region: 'Duyên hải & Tây Nguyên',
    landmarkTitle: 'Thị trấn Măng Đen & Đảo Lý Sơn',
    landmarkDesc: 'Sự giao hòa kỳ diệu giữa "Đà Lạt thứ hai" Măng Đen (Kon Tum cũ) đại ngàn thông reo và đảo núi lửa Lý Sơn biển xanh',
    icon: 'fa-tree',
    color: '#059669',
    keywords: [
      'quảng ngãi', 'kon tum', 'kontum', 'măng đen', 'mang den', 'kon plông', 'kon plong',
      'hồ đăk ke', 'thác pa sỹ', 'pa sy', 'đức mẹ măng đen', 'nhà rông kon tum', 'cầu treo kon klor',
      'nhà thờ gỗ kon tum', 'ngã ba đông dương', 'bờ y', 'ngọc linh', 'chư mom ray',
      'lý sơn', 'đảo bé', 'cổng tò vò', 'sa huỳnh', 'mỹ khê quảng ngãi', 'ba tơ', 'trà bồng',
    ],
  },
  'Gia Lai': {
    region: 'Duyên hải & Tây Nguyên',
    landmarkTitle: 'Biển Quy Nhơn – Kỳ Co Eo Gió & Biển Hồ Pleiku',
    landmarkDesc: 'Từ đôi mắt Pleiku Biển Hồ, núi lửa Chư Đăng Ya nối thẳng ra thiên đường biển Kỳ Co – Eo Gió (Bình Định cũ)',
    icon: 'fa-water',
    color: '#0284c7',
    keywords: ['gia lai', 'bình định', 'quy nhơn', 'kỳ co', 'eo gió', 'hòn khô', 'cù lao xanh', 'ghềnh ráng', 'tháp đôi', 'trung lương', 'pleiku', 'biển hồ', 'chư đăng ya', 'hàng thông trăm tuổi', 'kbang'],
  },
  'Đắk Lắk': {
    region: 'Duyên hải & Tây Nguyên',
    landmarkTitle: 'Gành Đá Đĩa Phú Yên & Thủ phủ Cà Phê Buôn Ma Thuột',
    landmarkDesc: 'Xứ sở hoa vàng trên cỏ xanh Phú Yên (Gành Đá Đĩa, Mũi Điện) kết nối đại ngàn Buôn Đôn, thác Dray Nur',
    icon: 'fa-mug-hot',
    color: '#b45309',
    keywords: ['đắk lắk', 'đăk lăk', 'dak lak', 'phú yên', 'tuy hòa', 'gành đá đĩa', 'ghềnh đá đĩa', 'mũi điện', 'bãi xép', 'vũng rô', 'hòn yến', 'nhất tự sơn', 'buôn ma thuột', 'bản đôn', 'hồ lắk', 'dray nur', 'dray sap'],
  },
  'Khánh Hòa': {
    region: 'Duyên hải Nam Trung Bộ',
    landmarkTitle: 'Vịnh Nha Trang – Vĩnh Hy – Quần đảo Trường Sa',
    landmarkDesc: 'Thiên đường biển đảo Nha Trang, Cam Ranh kết hợp vịnh Vĩnh Hy, đồi cát Nam Cương (Ninh Thuận cũ) & QĐ. Trường Sa',
    icon: 'fa-sun',
    color: '#0ea5e9',
    keywords: ['khánh hòa', 'ninh thuận', 'nha trang', 'cam ranh', 'vân phong', 'điệp sơn', 'hòn tằm', 'vinwonders', 'tháp bà ponagar', 'vĩnh hy', 'phan rang', 'tháp chàm', 'hang rái', 'bình hưng', 'bình ba', 'bình lập', 'mũi dinh', 'đồi cát nam cương', 'trường sa'],
  },
  'Lâm Đồng': {
    region: 'Tây Nguyên & Duyên hải',
    landmarkTitle: 'Thành phố Ngàn Hoa Đà Lạt – Hồ Tà Đùng – Biển Mũi Né',
    landmarkDesc: 'Hành trình từ sương mù Đà Lạt, Vịnh Hạ Long Tây Nguyên Tà Đùng (Đắk Nông cũ) tới biển xanh cát trắng Mũi Né, đảo Phú Quý (Bình Thuận cũ)',
    icon: 'fa-fan',
    color: '#db2777',
    keywords: ['lâm đồng', 'đà lạt', 'da lat', 'bảo lộc', 'langbiang', 'hồ xuân hương', 'cầu đất', 'hồ tuyền lâm', 'đắk nông', 'tà đùng', 'bình thuận', 'mũi né', 'phan thiết', 'phú quý', 'đảo phú quý', 'bàu trắng', 'kê gà', 'cổ thạch'],
  },
  'Đồng Nai': {
    region: 'Đông Nam Bộ',
    landmarkTitle: 'Vườn quốc gia Cát Tiên & Hồ Trị An',
    landmarkDesc: 'Rừng nguyên sinh Nam Cát Tiên, hồ Trị An cắm trại và thác Đứng, Bù Gia Mập (Bình Phước cũ)',
    icon: 'fa-campground',
    color: '#16a34a',
    keywords: ['đồng nai', 'bình phước', 'biên hòa', 'trị an', 'hồ trị an', 'nam cát tiên', 'cát tiên', 'đá ba chồng', 'bù gia mập', 'sóc bom bo', 'bà rà'],
  },
  'Tây Ninh': {
    region: 'Đông Nam Bộ',
    landmarkTitle: 'Đỉnh Núi Bà Đen – Nóc nhà Nam Bộ',
    landmarkDesc: 'Tượng Phật Bà Tây Bổ Đà Sơn trên mây, Tòa Thánh Cao Đài và làng nổi Tân Lập (Long An cũ)',
    icon: 'fa-place-of-worship',
    color: '#7c3aed',
    keywords: ['tây ninh', 'long an', 'núi bà đen', 'tòa thánh', 'hồ dầu tiếng', 'ma thiên lãnh', 'làng nổi tân lập', 'tân lập'],
  },
  'TP. Hồ Chí Minh': {
    region: 'Đông Nam Bộ & Biển Đảo',
    landmarkTitle: 'Sài Gòn Hoa Lệ – Biển Vũng Tàu – Côn Đảo',
    landmarkDesc: 'Siêu đô thị kết nối Bến Bạch Đằng, Landmark 81 với biển Vũng Tàu, Hồ Tràm, Côn Đảo (Bà Rịa - Vũng Tàu cũ) & Bình Dương',
    icon: 'fa-city',
    color: '#e11d48',
    keywords: ['hồ chí minh', 'sài gòn', 'saigon', 'tp hcm', 'tphcm', 'bình dương', 'bà rịa', 'vũng tàu', 'hồ tràm', 'hồ cóc', 'long hải', 'phước hải', 'côn đảo', 'cần giờ', 'củ chi', 'dầu tiếng bình dương'],
  },
  'Đồng Tháp': {
    region: 'Đồng bằng sông Cửu Long',
    landmarkTitle: 'Vườn Quốc Gia Tràm Chim – Làng Hoa Sa Đéc',
    landmarkDesc: 'Xứ sở sen hồng Tháp Mười, làng hoa Sa Đéc rực rỡ và cù lao Thới Sơn, chợ nổi Cái Bè (Tiền Giang cũ)',
    icon: 'fa-seedling',
    color: '#ec4899',
    keywords: ['đồng tháp', 'tiền giang', 'sa đéc', 'tràm chim', 'gáo giồng', 'xẻo quýt', 'mỹ tho', 'cái bè', 'thới sơn', 'gò công'],
  },
  'Vĩnh Long': {
    region: 'Đồng bằng sông Cửu Long',
    landmarkTitle: 'Xứ Dừa Bến Tre – Ao Bà Om – Cầu Mỹ Thuận',
    landmarkDesc: 'Miền sông nước miệt vườn Vĩnh Long hợp nhất cùng Xứ Dừa Bến Tre và văn hóa Khmer Trà Vinh',
    icon: 'fa-ship',
    color: '#10b981',
    keywords: ['vĩnh long', 'bến tre', 'trà vinh', 'cầu mỹ thuận', 'cù lao an bình', 'cồn phụng', 'ao bà om', 'biển ba động'],
  },
  'Cần Thơ': {
    region: 'Đồng bằng sông Cửu Long',
    landmarkTitle: 'Chợ Nổi Cái Răng – Bến Ninh Kiều – Chùa Dơi',
    landmarkDesc: 'Tây Đô sông nước hữu tình kết nối cùng lễ hội Óoc Om Bóc, chùa Som Rong (Sóc Trăng cũ) và rừng tràm Vị Thủy (Hậu Giang cũ)',
    icon: 'fa-water',
    color: '#f59e0b',
    keywords: ['cần thơ', 'sóc trăng', 'hậu giang', 'ninh kiều', 'cái răng', 'chợ nổi', 'nhà cổ bình thủy', 'cồn sơn', 'chùa dơi', 'som rong', 'vị thủy', 'lung ngọc hoàng'],
  },
  'An Giang': {
    region: 'Đồng bằng sông Cửu Long & Biển Đảo',
    landmarkTitle: 'Đảo Ngọc Phú Quốc – Rừng Tràm Trà Sư – Núi Cấm',
    landmarkDesc: 'Sự kết hợp tuyệt mỹ giữa vùng Thất Sơn Châu Đốc linh thiêng và thiên đường biển đảo Phú Quốc, Nam Du, Hà Tiên (Kiên Giang cũ)',
    icon: 'fa-umbrella-beach',
    color: '#06b6d4',
    keywords: ['an giang', 'kiên giang', 'phú quốc', 'bãi sao', 'hòn thơm', 'rạch giá', 'hà tiên', 'nam du', 'hòn sơn', 'bà lụa', 'châu đốc', 'núi sập', 'núi cấm', 'trà sư', 'tịnh biên', 'tri tôn', 'cây thốt nốt'],
  },
  'Cà Mau': {
    region: 'Đồng bằng sông Cửu Long',
    landmarkTitle: 'Đất Mũi Cà Mau & Cánh đồng điện gió Bạc Liêu',
    landmarkDesc: 'Cực Nam thiêng liêng của Tổ quốc, rừng ngập mặn U Minh Hạ và nhà Công tử Bạc Liêu, cánh đồng điện gió trên biển',
    icon: 'fa-compass',
    color: '#0d9488',
    keywords: ['cà mau', 'bạc liêu', 'đất mũi', 'u minh', 'hòn khoai', 'đá bạc', 'nhà công tử bạc liêu', 'điện gió bạc liêu'],
  },
};

/**
 * Từ điển các địa danh du lịch nổi tiếng kèm tọa độ chính xác [lon, lat],
 * tỉnh cũ (trước sáp nhập) và tỉnh/thành mới (trong 34 tỉnh/thành sau sáp nhập).
 */
export const FAMOUS_PLACES = [
  // Măng Đen & Kon Tum -> Tỉnh Quảng Ngãi mới
  { name: 'Măng Đen', aliases: ['măng đen', 'mang den', 'kon plông', 'kon plong', 'thác pa sỹ', 'hồ đăk ke', 'đức mẹ măng đen'], oldProvince: 'Kon Tum', newProvince: 'Quảng Ngãi', lon: 108.288, lat: 14.598 },
  { name: 'TP. Kon Tum', aliases: ['kon tum', 'kontum', 'nhà rông kon tum', 'nhà thờ gỗ kon tum', 'kon klor', 'bờ y', 'ngã ba đông dương'], oldProvince: 'Kon Tum', newProvince: 'Quảng Ngãi', lon: 108.005, lat: 14.354 },
  { name: 'Đảo Lý Sơn', aliases: ['lý sơn', 'ly son', 'đảo bé', 'cổng tò vò'], oldProvince: 'Quảng Ngãi', newProvince: 'Quảng Ngãi', lon: 109.118, lat: 15.382 },
  { name: 'Quảng Ngãi', aliases: ['quảng ngãi', 'quang ngai', 'sa huỳnh'], oldProvince: 'Quảng Ngãi', newProvince: 'Quảng Ngãi', lon: 108.804, lat: 15.121 },

  // Huế
  { name: 'Cố Đô Huế', aliases: ['huế', 'hue', 'đại nội', 'sông hương', 'thiên mụ', 'lăng cô', 'phá tam giang', 'bạch mã'], oldProvince: 'Thừa Thiên Huế', newProvince: 'Huế', lon: 107.578, lat: 16.467 },

  // Đà Nẵng & Quảng Nam -> TP. Đà Nẵng mới
  { name: 'Phố Cổ Hội An', aliases: ['hội an', 'hoi an', 'cù lao chàm', 'mỹ sơn', 'rừng dừa bảy mẫu', 'quảng nam'], oldProvince: 'Quảng Nam', newProvince: 'Đà Nẵng', lon: 108.328, lat: 15.879 },
  { name: 'Đà Nẵng', aliases: ['đà nẵng', 'da nang', 'bà nà', 'cầu vàng', 'cầu rồng', 'sơn trà', 'mỹ khê'], oldProvince: 'Đà Nẵng', newProvince: 'Đà Nẵng', lon: 108.202, lat: 16.054 },

  // Đà Lạt, Đắk Nông, Bình Thuận -> Tỉnh Lâm Đồng mới
  { name: 'Đà Lạt', aliases: ['đà lạt', 'da lat', 'langbiang', 'bảo lộc', 'cầu đất', 'tuyền lâm'], oldProvince: 'Lâm Đồng', newProvince: 'Lâm Đồng', lon: 108.458, lat: 11.940 },
  { name: 'Hồ Tà Đùng', aliases: ['tà đùng', 'ta dung', 'đắk nông', 'dak nong'], oldProvince: 'Đắk Nông', newProvince: 'Lâm Đồng', lon: 107.975, lat: 11.862 },
  { name: 'Mũi Né – Phan Thiết', aliases: ['mũi né', 'mui ne', 'phan thiết', 'bình thuận', 'bàu trắng', 'kê gà'], oldProvince: 'Bình Thuận', newProvince: 'Lâm Đồng', lon: 108.287, lat: 10.933 },
  { name: 'Đảo Phú Quý', aliases: ['phú quý', 'đảo phú quý', 'phu quy'], oldProvince: 'Bình Thuận', newProvince: 'Lâm Đồng', lon: 108.947, lat: 10.532 },

  // Nha Trang & Ninh Thuận -> Tỉnh Khánh Hòa mới
  { name: 'Nha Trang', aliases: ['nha trang', 'cam ranh', 'hòn tằm', 'vinwonders', 'ponagar', 'điệp sơn', 'khánh hòa'], oldProvince: 'Khánh Hòa', newProvince: 'Khánh Hòa', lon: 109.196, lat: 12.238 },
  { name: 'Vịnh Vĩnh Hy – Phan Rang', aliases: ['vĩnh hy', 'vinh hy', 'phan rang', 'ninh thuận', 'hang rái', 'bình hưng', 'bình lập'], oldProvince: 'Ninh Thuận', newProvince: 'Khánh Hòa', lon: 109.205, lat: 11.722 },

  // Quy Nhơn (Bình Định) & Pleiku -> Tỉnh Gia Lai mới
  { name: 'Quy Nhơn – Kỳ Co Eo Gió', aliases: ['quy nhơn', 'quy nhon', 'kỳ co', 'eo gió', 'bình định', 'hòn khô', 'cù lao xanh'], oldProvince: 'Bình Định', newProvince: 'Gia Lai', lon: 109.219, lat: 13.783 },
  { name: 'Pleiku – Biển Hồ', aliases: ['pleiku', 'biển hồ', 'chư đăng ya', 'gia lai'], oldProvince: 'Gia Lai', newProvince: 'Gia Lai', lon: 108.000, lat: 13.983 },

  // Phú Yên & Buôn Ma Thuột -> Tỉnh Đắk Lắk mới
  { name: 'Phú Yên – Gành Đá Đĩa', aliases: ['phú yên', 'phu yen', 'tuy hòa', 'gành đá đĩa', 'ghềnh đá đĩa', 'mũi điện', 'bãi xép'], oldProvince: 'Phú Yên', newProvince: 'Đắk Lắk', lon: 109.293, lat: 13.353 },
  { name: 'Buôn Ma Thuột', aliases: ['buôn ma thuột', 'buon ma thuot', 'bản đôn', 'hồ lắk', 'đắk lắk', 'dak lak'], oldProvince: 'Đắk Lắk', newProvince: 'Đắk Lắk', lon: 108.038, lat: 12.666 },

  // Quảng Bình & Quảng Trị -> Tỉnh Quảng Trị mới
  { name: 'Phong Nha – Quảng Bình', aliases: ['phong nha', 'quảng bình', 'quang binh', 'đồng hới', 'nhật lệ', 'sơn đoòng', 'động thiên đường', 'suối moọc'], oldProvince: 'Quảng Bình', newProvince: 'Quảng Trị', lon: 106.283, lat: 17.591 },

  // Phú Quốc (Kiên Giang) & Châu Đốc -> Tỉnh An Giang mới
  { name: 'Đảo Ngọc Phú Quốc', aliases: ['phú quốc', 'phu quoc', 'bãi sao', 'hòn thơm', 'rạch giá', 'kiên giang'], oldProvince: 'Kiên Giang', newProvince: 'An Giang', lon: 103.984, lat: 10.289 },
  { name: 'Quần Đảo Nam Du – Hà Tiên', aliases: ['nam du', 'hòn sơn', 'hà tiên', 'bà lụa'], oldProvince: 'Kiên Giang', newProvince: 'An Giang', lon: 104.355, lat: 9.682 },
  { name: 'Châu Đốc – Rừng Tràm Trà Sư', aliases: ['châu đốc', 'trà sư', 'núi cấm', 'an giang', 'tịnh biên', 'tri tôn'], oldProvince: 'An Giang', newProvince: 'An Giang', lon: 105.118, lat: 10.699 },

  // Vũng Tàu, Côn Đảo, Bình Dương -> TP. Hồ Chí Minh mới
  { name: 'Vũng Tàu – Hồ Tràm', aliases: ['vũng tàu', 'vung tau', 'bà rịa', 'hồ tràm', 'hồ cóc', 'long hải'], oldProvince: 'Bà Rịa - Vũng Tàu', newProvince: 'TP. Hồ Chí Minh', lon: 107.084, lat: 10.346 },
  { name: 'Côn Đảo', aliases: ['côn đảo', 'con dao'], oldProvince: 'Bà Rịa - Vũng Tàu', newProvince: 'TP. Hồ Chí Minh', lon: 106.608, lat: 8.685 },
  { name: 'Sài Gòn – TP.HCM', aliases: ['sài gòn', 'saigon', 'hồ chí minh', 'tp hcm', 'tphcm'], oldProvince: 'TP. Hồ Chí Minh', newProvince: 'TP. Hồ Chí Minh', lon: 106.701, lat: 10.776 },

  // Hà Giang -> Tỉnh Tuyên Quang mới
  { name: 'Hà Giang – Đồng Văn', aliases: ['hà giang', 'ha giang', 'đồng văn', 'mã pí lèng', 'nho quế', 'lũng cú', 'mèo vạc', 'hoàng su phì', 'du già'], oldProvince: 'Hà Giang', newProvince: 'Tuyên Quang', lon: 105.363, lat: 23.279 },

  // Sa Pa (Lào Cai) & Mù Cang Chải (Yên Bái) -> Tỉnh Lào Cai mới
  { name: 'Sa Pa – Đỉnh Fansipan', aliases: ['sa pa', 'sapa', 'fansipan', 'bản cát cát', 'y tý', 'lào cai'], oldProvince: 'Lào Cai', newProvince: 'Lào Cai', lon: 103.844, lat: 22.336 },
  { name: 'Mù Cang Chải – Trạm Tấu', aliases: ['mù cang chải', 'mu cang chai', 'trạm tấu', 'tú lệ', 'khau phạ', 'yên bái'], oldProvince: 'Yên Bái', newProvince: 'Lào Cai', lon: 104.088, lat: 21.850 },

  // Tam Đảo (Vĩnh Phúc) & Mai Châu (Hòa Bình) -> Tỉnh Phú Thọ mới
  { name: 'Thị Trấn Sương Mù Tam Đảo', aliases: ['tam đảo', 'tam dao', 'đại lải', 'tây thiên', 'vĩnh phúc'], oldProvince: 'Vĩnh Phúc', newProvince: 'Phú Thọ', lon: 105.644, lat: 21.456 },
  { name: 'Thung Lũng Mai Châu', aliases: ['mai châu', 'mai chau', 'thung nai', 'hòa bình', 'hoà bình', 'kim bôi'], oldProvince: 'Hòa Bình', newProvince: 'Phú Thọ', lon: 105.084, lat: 20.662 },

  // Hồ Ba Bể (Bắc Kạn) -> Tỉnh Thái Nguyên mới
  { name: 'Vườn Quốc Gia Hồ Ba Bể', aliases: ['hồ ba bể', 'ba bể', 'bắc kạn'], oldProvince: 'Bắc Kạn', newProvince: 'Thái Nguyên', lon: 105.616, lat: 22.416 },

  // Các điểm nổi tiếng miền Bắc khác
  { name: 'Vịnh Hạ Long', aliases: ['hạ long', 'ha long', 'cô tô', 'bình liêu', 'yên tử', 'quảng ninh'], oldProvince: 'Quảng Ninh', newProvince: 'Quảng Ninh', lon: 107.085, lat: 20.950 },
  { name: 'Đảo Cát Bà', aliases: ['cát bà', 'cat ba', 'lan hạ', 'đồ sơn', 'hải phòng'], oldProvince: 'Hải Phòng', newProvince: 'Hải Phòng', lon: 107.048, lat: 20.727 },
  { name: 'Tràng An – Tam Cốc', aliases: ['tràng an', 'tam cốc', 'hang múa', 'bái đính', 'hoa lư', 'ninh bình'], oldProvince: 'Ninh Bình', newProvince: 'Ninh Bình', lon: 105.916, lat: 20.250 },
  { name: 'Chùa Tam Chúc', aliases: ['tam chúc', 'hà nam'], oldProvince: 'Hà Nam', newProvince: 'Ninh Bình', lon: 105.805, lat: 20.562 },
  { name: 'Mộc Châu – Tà Xùa', aliases: ['mộc châu', 'moc chau', 'tà xùa', 'ta xua', 'pha luông', 'sơn la'], oldProvince: 'Sơn La', newProvince: 'Sơn La', lon: 104.633, lat: 20.844 },
  { name: 'Thác Bản Giốc', aliases: ['bản giốc', 'pác bó', 'cao bằng'], oldProvince: 'Cao Bằng', newProvince: 'Cao Bằng', lon: 106.723, lat: 22.855 },
  { name: 'Pù Luông – Sầm Sơn', aliases: ['pù luông', 'pu luong', 'sầm sơn', 'hải tiến', 'thanh hóa'], oldProvince: 'Thanh Hóa', newProvince: 'Thanh Hóa', lon: 105.165, lat: 20.453 },
  { name: 'Thủ Đô Hà Nội', aliases: ['hà nội', 'ha noi', 'hồ gươm', 'hoàn kiếm', 'ba vì'], oldProvince: 'Hà Nội', newProvince: 'Hà Nội', lon: 105.852, lat: 21.028 },
  { name: 'Xứ Dừa Bến Tre', aliases: ['bến tre', 'ben tre', 'cồn phụng'], oldProvince: 'Bến Tre', newProvince: 'Vĩnh Long', lon: 106.375, lat: 10.243 },
  { name: 'Chợ Nổi Cái Răng – Cần Thơ', aliases: ['cần thơ', 'can tho', 'ninh kiều', 'cái răng'], oldProvince: 'Cần Thơ', newProvince: 'Cần Thơ', lon: 105.747, lat: 10.004 },
  { name: 'Đất Mũi Cà Mau', aliases: ['đất mũi', 'cà mau', 'bạc liêu', 'điện gió bạc liêu'], oldProvince: 'Cà Mau', newProvince: 'Cà Mau', lon: 104.758, lat: 8.613 },
];

/**
 * Tính toán điểm trung tâm (centroid) của đa giác lớn nhất cho mỗi tỉnh
 */
function computeLargestPolygonCentroid(polys) {
  let bestRing = polys[0];
  let bestArea = 0;
  for (const ring of polys) {
    let a = 0;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      a += ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1];
    }
    if (Math.abs(a) > bestArea) {
      bestArea = Math.abs(a);
      bestRing = ring;
    }
  }
  let lon = 0, lat = 0;
  for (const pt of bestRing) {
    lon += pt[0];
    lat += pt[1];
  }
  return [lon / bestRing.length, lat / bestRing.length];
}

/**
 * Kiểm tra điểm (lon, lat) có nằm trong đa giác hay không (Ray-casting)
 */
function pointInRing(lon, lat, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1];
    const xj = ring[j][0], yj = ring[j][1];
    const intersect = yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi + 1e-12) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Danh sách 34 tỉnh/thành đã chuẩn hóa kèm centroid, polygon và metadata
 */
export const VIETNAM_34_PROVINCES = PROVINCE_SHAPES.map((p) => {
  const meta = PROVINCE_META[p.name] || {
    region: 'Việt Nam',
    landmarkTitle: p.name,
    landmarkDesc: `Sáp nhập: ${p.merged}`,
    icon: 'fa-location-dot',
    color: '#e11d48',
    keywords: [p.name.toLowerCase()],
  };
  const [centerLon, centerLat] = computeLargestPolygonCentroid(p.polys);
  return {
    ...p,
    ...meta,
    centerLon,
    centerLat,
  };
});

/**
 * Tìm tỉnh/thành mới dựa trên tọa độ GPS (lat, lng)
 */
export function findProvinceByLatLng(lat, lng) {
  if (typeof lat !== 'number' || typeof lng !== 'number' || Number.isNaN(lat) || Number.isNaN(lng)) {
    return null;
  }
  for (const prov of VIETNAM_34_PROVINCES) {
    for (const ring of prov.polys) {
      if (pointInRing(lng, lat, ring)) {
        return prov;
      }
    }
  }
  // Nếu ở ven biển/đảo nhỏ gần bờ, tìm tỉnh có centroid gần nhất (< 1.2 độ)
  let closest = null;
  let minDist = 1.5;
  for (const prov of VIETNAM_34_PROVINCES) {
    const d = Math.hypot(prov.centerLon - lng, prov.centerLat - lat);
    if (d < minDist) {
      minDist = d;
      closest = prov;
    }
  }
  return closest;
}

/**
 * Nhận diện địa danh du lịch / tỉnh cũ -> Tỉnh mới sau sáp nhập (34 tỉnh thành)
 * Ví dụ: Nhập "Măng Đen" -> trả về:
 *   {
 *     placeName: "Măng Đen",
 *     oldProvince: "Kon Tum",
 *     newProvince: "Quảng Ngãi",
 *     newProvinceFull: "Tỉnh Quảng Ngãi",
 *     mergedInfo: "Quảng Ngãi, Kon Tum",
 *     isMergedChange: true,
 *     summaryLabel: "Măng Đen (Kon Tum cũ) • Tỉnh Quảng Ngãi mới",
 *     lon: 108.288,
 *     lat: 14.598,
 *     provinceObj: {...}
 *   }
 */
export function resolveVietnamLocation(rawText = '', lat = undefined, lng = undefined) {
  const norm = stripVn(rawText);

  // 1. Ưu tiên khớp trong từ điển Địa danh nổi tiếng (Măng Đen, Hội An, Đà Lạt, Phú Quốc, Hà Giang...)
  if (norm) {
    for (const place of FAMOUS_PLACES) {
      const matched = place.aliases.some((alias) => norm.includes(stripVn(alias)));
      if (matched) {
        const prov = VIETNAM_34_PROVINCES.find((p) => p.name === place.newProvince);
        if (prov) {
          const isMergedChange = stripVn(place.oldProvince) !== stripVn(prov.name);
          return {
            placeName: place.name,
            oldProvince: place.oldProvince,
            newProvince: prov.name,
            newProvinceFull: `${prov.type} ${prov.name}`,
            mergedInfo: prov.merged,
            isMergedChange,
            summaryLabel: isMergedChange
              ? `${place.name} (${place.oldProvince} cũ) ➔ ${prov.type} ${prov.name} mới`
              : `${place.name} • ${prov.type} ${prov.name}`,
            lon: typeof lng === 'number' ? lng : place.lon,
            lat: typeof lat === 'number' ? lat : place.lat,
            province: prov,
          };
        }
      }
    }

    // 2. Khớp theo từ khóa của 34 tỉnh/thành và danh sách tỉnh cũ trong `merged`
    for (const prov of VIETNAM_34_PROVINCES) {
      const mergedParts = prov.merged.split(',').map((s) => s.trim());
      const matchedOldPart = mergedParts.find((part) => norm.includes(stripVn(part)));
      const matchedKeyword = prov.keywords.some((kw) => norm.includes(stripVn(kw)));

      if (matchedOldPart || matchedKeyword) {
        const oldProv = matchedOldPart || prov.name;
        const isMergedChange = stripVn(oldProv) !== stripVn(prov.name);
        return {
          placeName: rawText.trim() || prov.name,
          oldProvince: oldProv,
          newProvince: prov.name,
          newProvinceFull: `${prov.type} ${prov.name}`,
          mergedInfo: prov.merged,
          isMergedChange,
          summaryLabel: isMergedChange
            ? `${oldProv} cũ ➔ ${prov.type} ${prov.name} mới (${prov.merged})`
            : `${prov.type} ${prov.name}`,
          lon: typeof lng === 'number' ? lng : prov.centerLon,
          lat: typeof lat === 'number' ? lat : prov.centerLat,
          province: prov,
        };
      }
    }
  }

  // 3. Nếu có tọa độ GPS (lat, lng), kiểm tra Point-in-Polygon trên 34 tỉnh/thành
  if (typeof lat === 'number' && typeof lng === 'number') {
    const prov = findProvinceByLatLng(lat, lng);
    if (prov) {
      return {
        placeName: rawText.trim() || prov.name,
        oldProvince: prov.name,
        newProvince: prov.name,
        newProvinceFull: `${prov.type} ${prov.name}`,
        mergedInfo: prov.merged,
        isMergedChange: prov.merged.includes(','),
        summaryLabel: `${prov.type} ${prov.name} (${prov.merged})`,
        lon: lng,
        lat,
        province: prov,
      };
    }
  }

  return null;
}

