#!/usr/bin/env node
/**
 * don_dep_lib.js — Sinh script dọn bản scan sau khi đã soạn xong văn bản.
 *
 * Tách riêng vì có hai lệnh cùng cần nó (chay_hang_loat.js chạy cả lô một lượt,
 * chay_cuon_chieu.js chạy cuốn chiếu từng hồ sơ). Hai bản sao của một đoạn mã đi xoá
 * hồ sơ đất đai là thứ sớm muộn cũng lệch nhau, và lệch về phía nguy hiểm.
 *
 * Script sinh ra chia bản scan thành hai đống rạch ròi rồi mới hỏi xoá:
 *   _CAN_XOA\          hồ sơ ĐÃ soạn xong đủ bộ văn bản
 *   _CHUA_XU_LY_DUOC\  hồ sơ chưa soạn được, giữ tiền tố [tên rổ] để biết đường trả về
 *
 * Hỏi hai lần: lần một để dồn file, lần hai (phải gõ đúng chữ XOA) để xoá đống
 * _CAN_XOA. Xoá bằng cách chuyển vào Thùng rác chứ không xoá thẳng — hồ sơ đất đai
 * xoá nhầm thì không dựng lại được, mà người dùng vẫn đạt được điều họ muốn là thư
 * mục sạch. Ai muốn xoá vĩnh viễn thì dọn Thùng rác, đó là một hành động có ý thức.
 */
'use strict';
const fs = require('fs');
const path = require('path');

/** Lấy tên file cuối đường dẫn Windows. Không dùng path.basename: script có thể chạy
 *  trên Linux, ở đó dấu \ không được coi là dấu phân cách. */
function tenCuoi(p) {
  return String(p || '').replace(/\//g, '\\').replace(/\\+$/, '').split('\\').pop();
}
function thuMucCha(p) {
  return String(p || '').replace(/\//g, '\\').replace(/\\+$/, '').split('\\').slice(0, -1).join('\\');
}

/**
 * @param {string} gocRa           thư mục ghi hai file script
 * @param {string} gocDaPhanLoai   thư mục "Đã phân loại" BÊN MÁY NGƯỜI DÙNG
 * @param {Array}  xong            [{ duong_dan_dich }]  đã soạn đủ bộ
 * @param {Array}  ton             [{ duong_dan_dich, ly_do }]  chưa soạn được
 * @returns {string|null} đường dẫn file .ps1, hoặc null khi không có gocDaPhanLoai
 */
function sinhLenhDonDep(gocRa, gocDaPhanLoai, xong, ton) {
  if (!gocDaPhanLoai) return null;
  const goc = String(gocDaPhanLoai).replace(/\\+$/, '');
  const thuMucXoa = `${goc}\\_CAN_XOA`;
  const thuMucTon = `${goc}\\_CHUA_XU_LY_DUOC`;

  const ps = [];
  const A = ps.push.bind(ps);
  A("$ErrorActionPreference = 'Stop'");
  A('[Console]::OutputEncoding = [System.Text.Encoding]::UTF8');
  A("Write-Host ''");
  A("Write-Host '=== DON DEP SAU KHI SOAN VAN BAN ===' -ForegroundColor Cyan");
  A("Write-Host ''");
  A(`Write-Host 'Da soan xong  : ${xong.length} ho so'`);
  A(`Write-Host 'Chua soan duoc: ${ton.length} ho so'`);
  A("Write-Host ''");
  A("Write-Host 'Buoc 1 - don ban scan thanh hai dong:' -ForegroundColor Yellow");
  A(`Write-Host '  _CAN_XOA           <- da soan xong (${xong.length} file)'`);
  A(`Write-Host '  _CHUA_XU_LY_DUOC   <- chua soan duoc (${ton.length} file), giu tien to ten ro'`);
  A("Write-Host ''");
  A("$tl = Read-Host 'Go Y roi Enter de don (phim khac de huy)'");
  A("if ($tl -ne 'Y' -and $tl -ne 'y') { Write-Host 'Da huy.'; exit }");
  A(`New-Item -ItemType Directory -Force -Path "${thuMucXoa}" | Out-Null`);
  if (ton.length) A(`New-Item -ItemType Directory -Force -Path "${thuMucTon}" | Out-Null`);

  for (const x of xong) {
    const nguon = x.duong_dan_dich;
    if (!nguon) continue;
    A(`if (Test-Path -LiteralPath "${nguon}") { Move-Item -LiteralPath "${nguon}" -Destination "${thuMucXoa}\\${tenCuoi(nguon)}" -Force; Write-Host '  [xong] ${tenCuoi(nguon)}' }`);
  }
  for (const t of ton) {
    const nguon = t.duong_dan_dich;
    if (!nguon) continue;
    const roCu = tenCuoi(thuMucCha(nguon));
    A(`if (Test-Path -LiteralPath "${nguon}") { Move-Item -LiteralPath "${nguon}" -Destination "${thuMucTon}\\[${roCu}] ${tenCuoi(nguon)}" -Force; Write-Host '  [ton ] ${tenCuoi(nguon)}' }`);
  }

  A("Write-Host ''");
  A("Write-Host 'Buoc 2 - xoa cac ban scan da soan xong.' -ForegroundColor Yellow");
  A(`Write-Host 'Cac file trong ${thuMucXoa} se duoc chuyen vao Thung rac (con khoi phuc duoc).'`);
  A("Write-Host 'Mo thu muc do kiem tra truoc neu can. Go KHONG de giu lai.'");
  A("Write-Host ''");
  A("$tl2 = Read-Host 'Go XOA roi Enter de xoa (phim khac de giu lai)'");
  A("if ($tl2 -ne 'XOA') { Write-Host 'Da giu lai, khong xoa gi.' -ForegroundColor Green }");
  A('else {');
  A('  $sh = New-Object -ComObject Shell.Application');
  A(`  Get-ChildItem -LiteralPath "${thuMucXoa}" -File | ForEach-Object {`);
  A('    $sh.NameSpace(0).ParseName($_.FullName).InvokeVerb("delete")');
  A('    Write-Host "  da xoa: $($_.Name)"');
  A('  }');
  A("  Write-Host 'Da chuyen vao Thung rac.' -ForegroundColor Green");
  A('}');
  A("Write-Host ''");
  A("Write-Host 'XONG.' -ForegroundColor Green");

  fs.mkdirSync(gocRa, { recursive: true });
  const psPath = path.join(gocRa, 'don_dep_sau_soan.ps1');
  // BOM + CRLF: PowerShell đọc file không BOM theo bảng mã ANSI, tên file tiếng Việt
  // sẽ hỏng và lệnh Move-Item trỏ vào đường dẫn không tồn tại.
  fs.writeFileSync(psPath, '\ufeff' + ps.join('\r\n') + '\r\n', 'utf8');
  fs.writeFileSync(path.join(gocRa, 'CHAY_DON_DEP_SAU_SOAN.bat'),
    '@echo off\r\npowershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0don_dep_sau_soan.ps1"\r\npause\r\n', 'utf8');
  return psPath;
}

module.exports = { sinhLenhDonDep, tenCuoi, thuMucCha };
