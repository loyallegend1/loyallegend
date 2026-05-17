// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {Base64} from '@openzeppelin/contracts/utils/Base64.sol';
import {Strings} from '@openzeppelin/contracts/utils/Strings.sol';

/// @title LegendRenderer — on-chain SVG + JSON metadata for LoyalLegend cards
/// @notice Pure-view renderer. Takes (countryId, rank, tier) and returns a fully
///         self-contained data: URI. The image inside is an SVG generated from the
///         same call. No off-chain dependencies.
///
///         For each of 211 countries we store:
///           - Country name (variable length, ASCII)
///           - 3-letter FIFA code
///           - Flag data: 1 layout byte (0=horizontal stripes, 1=vertical) + 3 RGB colors
contract LegendRenderer {
    uint256 public constant COUNTRIES = 211;

    bytes private constant CODES   = hex'465241455350415247454e47504f524252414e45444d415242454c47455243524f495441434f4c53454e4d45585553415552554a504e53554944454e49524e5455524543554155544b4f524e4741415553414c4745475943414e4e4f52554b5253574557414c435a4554554e535242525553504f4c524f5543484948554e53434f53564b4752454d4c49504152434d5243495653564e4352435045525141544b534149524c4952514e495249534c42464146494e424948434f444748414a414d525341414c424d4b444350564f4d41555a4242554c484f4e50414e554145424f4c56454e4755494953524a4f524d4e4547454f42485243484e5a414d4741424c5558435557424c524841495359524d544e5649454b565842454e5547414b475a534c564551474d41444d4f5a5452494b454e544a4b54484141524d455354494e44534c454c54554359504c56414c4259544f474e4947434f4d414e474c424e46524f504c455a494d41544753444e4d5749415a454b415a474e42424f544e414d53555254414e4554484244494c4252534f4c59454d5257414e5a4c49444e484b47414e4453575a4c455343474f534b4e4d41534354414c43415048494d444156414e4146474d4456424552544148534750504e47544b4d4e4341444f4d56494e46494a4d59414c4945475559505552435542425242424c5a47524e54504547414d444d414d53524d52494e434c42414843414d42414e535450434f4b53414d4e45504252554d41434d4e4742485550414b4341594c414f444a49535249415255544c53455249534559534f4d434841544741535344474942424f45534d4e53424856474256495241494154434147554d4e4d495455564b4952';
    bytes private constant NAMES   = hex'4672616e6365537061696e417267656e74696e61456e676c616e64506f72747567616c4272617a696c4e65746865726c616e64734d6f726f63636f42656c6769756d4765726d616e7943726f617469614974616c79436f6c6f6d62696153656e6567616c4d657869636f555341557275677561794a6170616e537769747a65726c616e6444656e6d61726b4972616e5475726b69796545637561646f7241757374726961536f757468204b6f7265614e6967657269614175737472616c6961416c6765726961456779707443616e6164614e6f72776179556b7261696e6553776564656e57616c6573437a656368696154756e69736961536572626961527573736961506f6c616e64526f6d616e69614368696c6548756e6761727953636f746c616e64536c6f76616b69614772656563654d616c69506172616775617943616d65726f6f6e436f746520642749766f697265536c6f76656e6961436f737461205269636150657275516174617253617564692041726162696152657075626c6963206f66204972656c616e64497261714e6f72746865726e204972656c616e644963656c616e644275726b696e61204661736f46696e6c616e64426f736e696120616e64204865727a65676f76696e61445220436f6e676f4768616e614a616d61696361536f75746820416672696361416c62616e69614e6f727468204d616365646f6e69614361626f2056657264654f6d616e557a62656b697374616e42756c6761726961486f6e647572617350616e616d61554145426f6c6976696156656e657a75656c614775696e656149737261656c4a6f7264616e4d6f6e74656e6567726f47656f726769614261687261696e4368696e612050525a616d6269614761626f6e4c7578656d626f7572674375726163616f42656c61727573486169746953797269614d6175726974616e6961566965746e616d4b6f736f766f42656e696e5567616e64614b797267797a7374616e456c2053616c7661646f7245717561746f7269616c204775696e65614d6164616761736361724d6f7a616d62697175655472696e6964616420616e6420546f6261676f4b656e796154616a696b697374616e546861696c616e6441726d656e69614573746f6e6961496e646961536965727261204c656f6e654c69746875616e69614379707275734c61747669614c69627961546f676f4e69676572436f6d6f726f73416e676f6c614c6562616e6f6e4661726f652049736c616e647350616c657374696e655a696d6261627765416e746967756120616e642042617262756461537564616e4d616c617769417a65726261696a616e4b617a616b687374616e4775696e65612d426973736175426f747377616e614e616d69626961537572696e616d6554616e7a616e6961457468696f706961427572756e64694c696265726961536f6c6f6d6f6e2049736c616e647359656d656e5277616e64614e6577205a65616c616e64496e646f6e65736961486f6e67204b6f6e67416e646f7272614573776174696e694c65736f74686f52657075626c6963206f6620436f6e676f5361696e74204b6974747320616e64204e657669734d616c617973696143656e7472616c204166726963616e2052657075626c69635361696e74204c756369615068696c697070696e65734d6f6c646f766156616e7561747541666768616e697374616e4d616c64697665734265726d75646154616869746953696e6761706f72655061707561204e6577204775696e65615475726b6d656e697374616e4e6963617261677561446f6d696e6963616e2052657075626c69635361696e742056696e63656e7420616e64204772656e6164696e657346696a694d79616e6d61724c6965636874656e737465696e477579616e6150756572746f205269636f437562614261726261646f7342656c697a654772656e6164614368696e6573652054616970656947616d626961446f6d696e6963614d6f6e747365727261744d61757269746975734e65772043616c65646f6e6961426168616d617343616d626f64696142616e676c616465736853616f20546f6d6520616e64205072696e63697065436f6f6b2049736c616e647353616d6f614e6570616c4272756e65694d616361754d6f6e676f6c696142687574616e50616b697374616e4361796d616e2049736c616e64734c616f73446a69626f757469537269204c616e6b61417275626154696d6f722d4c65737465457269747265615365796368656c6c6573536f6d616c696143686164546f6e6761536f75746820537564616e47696272616c746172426f6e616972655361696e74204d617274696e5361696e742d4261727468656c656d79427269746973682056697267696e2049736c616e647355532056697267696e2049736c616e6473416e6775696c6c615475726b7320616e6420436169636f734775616d4e6f72746865726e204d617269616e612049736c616e6473547576616c754b69726962617469';
    bytes private constant OFFSETS = hex'00000006000b0014001b002300290034003b0042004900500055005d0064006a006d007400790084008b008f0096009d00a400af00b600bf00c600cb00d100d700de00e400e900f000f700fd0103010901100115011c0124012c01320136013e01460153015b01650169016e017a018d019101a101a801b401bb01d101d901de01e501f101f8020702110215021f0227022f02350238023f0248024e0254025a0264026b0272027a02800285028f0296029d02a202a702b102b802be02c302c902d302de02ef02f903030316031b0325032d0334033b0340034c0355035b03610366036a036f0376037c03830390039903a103b403b903bf03c903d303e003e803ef03f703ff0407040e041504240429042f043a0443044c0453045b046204730488049004a804b304be04c504cc04d704df04e604ec04f505050511051a052c0548054c05530560056605710575057d0583058a0598059e05a605b005b905c605cd05d505df05f406000605060a06100615061d0623062b0639063d0645064e0653065e0665066f0676067a067f068a0693069a06a606b606cc06dd06e506f506f907110717071f';
    bytes private constant FLAGS   = hex'010055a4ffffffef413500aa151bf1bf00aa151b0074acdfffffff74acdf00ffffffce1124ffffff01006600006600ff000000009c3bffdf00009c3b00ae1c28ffffff21468b00c1272dc1272dc1272d01000000fae042ed293900000000dd0000ffce0000ff0000ffffff17179601009246ffffffce2b3700fcd116003893ce11260100853ffdef42e31b2301006847ffffffce112600b22234ffffff3c3b6e00ffffff0038a8ffffff00ffffffbc002dffffff00ff0000ffffffff000000c8102effffffc8102e00239f40ffffffda000000e30a17ffffffe30a1700ffdd000033a0de281000ed2939ffffffed293900ffffffcd2e3a0047a001008753ffffff00875300012169ffffffe4002b01006233ffffffd2103400ce1126ffffff00000001ff0000ffffffff000000ef2b2dffffff00286800005bbb005bbbffd50000006aa7fecc00006aa700ffffffd3073100ab3900ffffff11457ed7141a00e70013ffffffe7001300c6363c0c4076ffffff00ffffff0033a0da291c00ffffffffffffdc143c01002b7ffcd116ce112600ffffffffffffd52b1e00ce2939ffffff477050000065bdffffff0065bd00ffffff0b4ea2ee1c25000d5eafffffff0d5eaf0114b53afcd116ce112600d52b1effffff0038a801007a5ece1126fcd11601ff8200ffffff009e6000ffffff0000ffff000000002b7fffffffce112601d91023ffffffd91023008a1538ffffff8a153800006c35006c35006c3501169b62ffffffff883e00ce1126ffffff00000000ffffffc8102effffff0002529cffffff02529c00ef2b2dfcd116009e4900ffffff003580ffffff00002f6cfecb00002f6c00007ffff7d618ce102100ce1126fcd116006b3f00009b3afed10000000000007a4dffffffffb81c00e41e20000000e41e2000d20000ffe600d2000000003893ffffffcf202700db161bffffff008000000099b5ffffff1eb53a00ffffff00966ed62612000073cfffffff0073cf00005aa7ffffffd210340000732fffffff00000000d52b1ef9e30000793400ffcc0000247dcf142b01ce1126fcd11600946000ffffff0038b8ffffff00000000ffffff007a3d00d4af37c40308d4af3700ffffffff0000ffffff00ffffffce1126ce112600de2910de2910ffde0000198a00198a00de700800009e60fcd1163a75c400ed2939ffffff00a1de00002b7fffe800002b7f00ce1720007c30ffffff0000209f00209fd2103400ce1126ffffff00000000d01c1f00a95cd01c1f00da251dffff00da251d00244aa5ffd700244aa500fcd116e8112d00875100000000fcdc04d9000000ff0000ffef00ff0000000f47afffffff0f47af003e9a00ffffffe3211801fffffffc3d32007e3a00009a00fce10000000000ce1126000000ce112600000000bb000000660000cc0000ffffff00660000a519312d2a4aa5193100d900120033a0f2a800000072ce000000ffffff00ff9933ffffff138808001eb53affffff0072c600fdb913006a44c1272d00ffffffd47600ffffff009e1b32ffffff9e1b3200e70013000000239e4600006a4effce00d2103400e05206ffffff0db02b00ffc61effffff3a75c400ce112600000000000000ed1c24ffffffed1c2400ffffff0065bdffffff00000000ffffff007a3d00078930fce100ef334000000000fcd1160072c600d21034ffffff00000000000000ce1126339e350000b5e2ef3340509e2f0000afca00afcafec50c00ce1126fcd116009e490075aadb00000075aadb00003580ffce0000954300377e3fb40a2d377e3f001eb53afcd11600a3dd00078930fcdd09da121a00ce1126ffffff1eb53a00bf0a30ffffff002868000051bafcd116215b3300ce1126ffffff0000000000a1defad20120603d00012169ffffffc8102e00ff0000ffffffffffff00de2910de2910de29100110069ffedf00d52b1e003e5eb9ffd900b10c0c0000209fffffff00954300009543fcd116dc241f00009e49fcd116ce112600cc0001ffffff01006600003082ffffff2897280065cfe9ffffff000000000038a8ffffffce1126010046aeffd200cc092f00000000d2103400954301000000d32011007a3600d21034007e3ad2103400cf142bffffff01216900ce1126ffffffce112600ed2939ffffffffffff00ce1126fcd116000000001eb53a1eb53affffff000067c6ffffff0067c600002d62ce1126ffffff010072c6fcd116009e49007dbeecffffff7dbeec00fecb0034b233ea283900002780002780ce112600009e49ffce00ce112600ce1126ffffffce112600002a8fffffff002a8f0100267fffc22200267f00003f87003f87ce112600ce1126fcd116009e4900fe0000000095fe000000ce1126ffffff3a772800006b3ffcd1160000000001216901216901216900ea28391a206d00a04d0000558ee921290095430000abc9ffcd4100abc900032ea1e00025032ea100006a4ef42a41006a4e0012ad2bffce0012ad2b00012169ffffff01216900ce1126012169ce112600dc143c003893dc143c00ffff00000000ffffff0000785effffff00785e01c4272f0066b3c4272f00ffcc33ff4e20ffcc3301ffffff01411c01411c0001216901216901216900ce1126002868ce1126006ab2e7ffffff12ad2b00ffbe298d153a005f3900418fdefed100418fde00dc241fffcd000000000012ad2bea0437418fde00003f87fcd856d6282800418fdeffffff418fde01002664fecb00c60c3000c10000ffffffc1000000000000da121a07893000ffffffda121affffff00ffe5000033ccffffff000055a4ffffffef4135000055a4ffffffef41350001216901216901216900ffffffffd700ffffff00012169ffffffff8c0000012169ffffffffd70000002868bf0a3000286800002b7fffffff002b7f007dbeecffd7007dbeec00e73e2fffd7000f47af';

    function _code(uint16 countryId) internal pure returns (string memory) {
        require(countryId < COUNTRIES, 'bad country');
        bytes memory out = new bytes(3);
        uint256 b = uint256(countryId) * 3;
        out[0] = CODES[b];
        out[1] = CODES[b + 1];
        out[2] = CODES[b + 2];
        return string(out);
    }

    function _name(uint16 countryId) internal pure returns (string memory) {
        require(countryId < COUNTRIES, 'bad country');
        uint256 i = uint256(countryId) * 2;
        uint256 s = (uint256(uint8(OFFSETS[i])) << 8) | uint256(uint8(OFFSETS[i + 1]));
        uint256 e = (uint256(uint8(OFFSETS[i + 2])) << 8) | uint256(uint8(OFFSETS[i + 3]));
        bytes memory out = new bytes(e - s);
        for (uint256 k = 0; k < e - s; k++) out[k] = NAMES[s + k];
        return string(out);
    }

    function _hex3(uint8 v) internal pure returns (bytes1) {
        return v < 10 ? bytes1(uint8(48 + v)) : bytes1(uint8(87 + v));
    }

    function _color(uint16 countryId, uint8 idx) internal pure returns (string memory) {
        uint256 base = uint256(countryId) * 10 + 1 + uint256(idx) * 3;
        bytes memory out = new bytes(7);
        out[0] = '#';
        for (uint8 j = 0; j < 3; j++) {
            uint8 b = uint8(FLAGS[base + j]);
            out[1 + j * 2]     = _hex3(b >> 4);
            out[1 + j * 2 + 1] = _hex3(b & 0x0F);
        }
        return string(out);
    }

    function _layout(uint16 countryId) internal pure returns (bool vertical) {
        return uint8(FLAGS[uint256(countryId) * 10]) == 1;
    }

    function _tierColor(uint8 tier) internal pure returns (string memory) {
        if (tier == 0) return '#9ca3af';
        if (tier == 1) return '#3b82f6';
        if (tier == 2) return '#a855f7';
        return '#f5c542';
    }

    function _tierLabel(uint8 tier) internal pure returns (string memory) {
        if (tier == 0) return 'COMMON';
        if (tier == 1) return 'RARE';
        if (tier == 2) return 'EPIC';
        return 'LEGENDARY';
    }

    function _flagSVG(uint16 countryId) internal pure returns (string memory) {
        string memory c1 = _color(countryId, 0);
        string memory c2 = _color(countryId, 1);
        string memory c3 = _color(countryId, 2);
        if (_layout(countryId)) {
            // Vertical stripes: 3 rects side-by-side inside the 432×260 frame at (24,80)
            return string(abi.encodePacked(
                '<g transform="translate(120 105)">',
                  '<rect x="0"   y="0" width="80" height="210" fill="', c1, '"/>',
                  '<rect x="80"  y="0" width="80" height="210" fill="', c2, '"/>',
                  '<rect x="160" y="0" width="80" height="210" fill="', c3, '"/>',
                '</g>'
            ));
        } else {
            return string(abi.encodePacked(
                '<g transform="translate(120 105)">',
                  '<rect x="0" y="0"   width="240" height="70" fill="', c1, '"/>',
                  '<rect x="0" y="70"  width="240" height="70" fill="', c2, '"/>',
                  '<rect x="0" y="140" width="240" height="70" fill="', c3, '"/>',
                '</g>'
            ));
        }
    }

    function renderSVG(uint16 countryId, uint16 rank, uint8 tier) public pure returns (string memory) {
        string memory rankStr = Strings.toString(rank);
        string memory tierColor = _tierColor(tier);
        string memory tierLabel = _tierLabel(tier);

        return string(abi.encodePacked(
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 600" width="480" height="600">',
            '<defs>',
                '<linearGradient id="b" x1="0%" y1="0%" x2="0%" y2="100%">',
                    '<stop offset="0%" stop-color="#111729"/>',
                    '<stop offset="100%" stop-color="#0a0e1a"/>',
                '</linearGradient>',
                '<pattern id="g" width="40" height="40" patternUnits="userSpaceOnUse">',
                    '<path d="M40 0L0 0 0 40" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="1"/>',
                '</pattern>',
            '</defs>',
            '<rect width="480" height="600" rx="24" fill="url(#b)" stroke="#1f2940" stroke-width="2"/>',
            _header(countryId, rankStr),
            '<rect x="24" y="72" width="432" height="332" rx="16" fill="#0a0e1a" stroke="#1f2940"/>',
            '<rect x="24" y="72" width="432" height="332" rx="16" fill="url(#g)"/>',
            _flagSVG(countryId),
            '<text x="240" y="388" fill="#e6edf7" font-family="Arial Black,sans-serif" font-weight="900" font-size="28" text-anchor="middle" letter-spacing="6">', _code(countryId), '</text>',
            _stats(rankStr, tierColor, tierLabel),
            '<rect x="0" y="540" width="480" height="60" fill="', tierColor, '"/>',
            '<text x="240" y="580" fill="#0a0e1a" font-family="Arial Black,sans-serif" font-weight="900" font-size="28" letter-spacing="12" text-anchor="middle">', tierLabel, '</text>',
            '</svg>'
        ));
    }

    function _header(uint16 countryId, string memory rankStr) internal pure returns (string memory) {
        return string(abi.encodePacked(
            '<text x="24" y="50" fill="#e6edf7" font-family="Arial Black,sans-serif" font-weight="900" font-size="22" letter-spacing="2">',
                _upper(_name(countryId)),
            '</text>',
            '<text x="456" y="50" fill="#8a96b2" font-family="ui-monospace,monospace" font-size="18" text-anchor="end">#', rankStr, '</text>'
        ));
    }

    function _stats(string memory rankStr, string memory tierColor, string memory tierLabel) internal pure returns (string memory) {
        return string(abi.encodePacked(
            '<text x="24" y="450" fill="#8a96b2" font-family="Arial,sans-serif" font-size="18">FIFA Rank</text>',
            '<text x="456" y="450" fill="#e6edf7" font-family="Arial,sans-serif" font-size="20" font-weight="700" text-anchor="end">#', rankStr, '</text>',
            '<text x="24" y="482" fill="#8a96b2" font-family="Arial,sans-serif" font-size="18">Tier</text>',
            '<text x="456" y="482" fill="', tierColor, '" font-family="Arial,sans-serif" font-size="20" font-weight="700" text-anchor="end">', tierLabel, '</text>'
        ));
    }

    function tokenURI(uint256 tokenId, uint16 countryId, uint16 rank, uint8 tier) external pure returns (string memory) {
        string memory svg = renderSVG(countryId, rank, tier);
        string memory imageData = string(abi.encodePacked('data:image/svg+xml;base64,', Base64.encode(bytes(svg))));
        string memory name = _name(countryId);

        bytes memory json = abi.encodePacked(
            '{"name":"LoyalLegend #', Strings.toString(tokenId), ' - ', name,
            '","description":"Football NFT bound to the live FIFA World Ranking of ', name,
            '. Tier upgrades and degrades automatically on-chain via the FifaOracle. Part of LoyalLegend - hold longer, become a legend.',
            '","image":"', imageData,
            '","attributes":[',
                '{"trait_type":"Country","value":"', name, '"},',
                '{"trait_type":"FIFA Rank","value":', Strings.toString(rank), '},',
                '{"trait_type":"Tier","value":"', _tierLabel(tier), '"},',
                '{"trait_type":"FIFA Code","value":"', _code(countryId), '"}',
            ']}'
        );

        return string(abi.encodePacked('data:application/json;base64,', Base64.encode(json)));
    }

    function _upper(string memory s) internal pure returns (string memory) {
        bytes memory b = bytes(s);
        bytes memory out = new bytes(b.length);
        for (uint256 i = 0; i < b.length; i++) {
            bytes1 c = b[i];
            out[i] = (c >= 0x61 && c <= 0x7A) ? bytes1(uint8(c) - 32) : c;
        }
        return string(out);
    }
}
