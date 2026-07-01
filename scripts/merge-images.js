const sharp = require("sharp");
const path = require("path");

const img1 = "C:/Users/USER/.cursor/projects/c-Users-USER-Downloads-BaoMatMayTinh/assets/c__Users_USER_AppData_Roaming_Cursor_User_workspaceStorage_125eaaf31bf6e0d4d1d51d903647913d_images_image-795ab2ea-ca67-47ea-8a81-c7d49b17d175.png";
const img2 = "C:/Users/USER/.cursor/projects/c-Users-USER-Downloads-BaoMatMayTinh/assets/c__Users_USER_AppData_Roaming_Cursor_User_workspaceStorage_125eaaf31bf6e0d4d1d51d903647913d_images_image-2d3ac736-6ea8-49d3-879a-cc3ef91039ea.png";
const out = "c:/Users/USER/Downloads/BaoMatMayTinh/public/profile-with-qr.png";

(async () => {
  const a = await sharp(img1).metadata();
  const b = await sharp(img2).metadata();
  console.log("ảnh 1:", a.width, "x", a.height);
  console.log("ảnh 2:", b.width, "x", b.height);

  // Lấy kích thước thật của cả 2 ảnh
  const aW = a.width, aH = a.height;
  const bW = b.width, bH = b.height;
  console.log(`ảnh 1 (banner ngang) ${aW}x${aH} | ảnh 2 (avatar+QR) ${bW}x${bH}`);

  // Ảnh 1 là ảnh nền (banner ngang), ảnh 2 là phần tử ghép vào giữa
  // Ảnh 2 sẽ được resize sao cho chiều cao vừa với ảnh 1, giữ tỉ lệ
  const targetH = aH;
  const scale = targetH / bH;
  const overlayW = Math.round(bW * scale);
  const overlayH = targetH;

  const overlayResized = await sharp(img2)
    .resize(overlayW, overlayH, { fit: "fill" })
    .png()
    .toBuffer();

  // Căn giữa theo chiều ngang
  const left = Math.round((aW - overlayW) / 2);

  await sharp(img1)
    .composite([
      { input: overlayResized, top: 0, left: left },
    ])
    .png({ quality: 95 })
    .toFile(out);

  console.log(`Đã ghép xong: ${out} (${aW}x${aH})`);
})();