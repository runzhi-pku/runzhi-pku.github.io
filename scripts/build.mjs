import { readFile, writeFile, mkdir, readdir, lstat, stat, copyFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const array = value => Array.isArray(value) ? value : [];
const arrow = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M7 17 17 7M7 7h10v10"/></svg>';
const fileIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6M8 13h8M8 17h6"/></svg>';
const down = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M12 3v12m-5-5 5 5 5-5M5 16v4h14v-4"/></svg>';

export function uploadPath(value) {
  if (typeof value !== 'string' || /[\\\x00-\x1f\x7f?#]/.test(value)) throw Error('文件路径无效。');
  const local = value.replace(/^\//, '');
  const parts = local.split('/');
  if (parts[0] !== 'uploads' || parts.length < 2 || parts.some(part => !part || part === '.' || part === '..')) throw Error('文件必须位于 uploads 文件夹内。');
  return local;
}

export function safeLink(value, ids = new Set()) {
  if (!value) return '';
  if (typeof value === 'string' && /^\/?uploads\//.test(value)) return uploadPath(value).split('/').map(encodeURIComponent).join('/');
  if (typeof value !== 'string' || /[\x00-\x20\x7f\\]/.test(value)) throw Error(`链接格式无效：${value}`);
  if (value.startsWith('#')) {
    if (!ids.has(value.slice(1))) return '';
    return value;
  }
  if (/^https?:\/\//i.test(value)) { const u = new URL(value); if (u.username || u.password) throw Error('链接不能包含登录凭据。'); return u.href; }
  if (/^mailto:[^<>]+@[^<>]+$/i.test(value)) return value;
  throw Error(`请使用完整的网址、mailto:邮箱地址或 #栏目地址：${value}`);
}

export async function renderSite(site, home, files, uploadInfo = async () => ({}), repository = '', branch = 'main') {
  if (!site.hero?.name?.trim()) throw Error('请填写姓名或昵称。');
  if (!site.title?.trim()) throw Error('请填写网站标题。');
  const sections = array(home.sections).filter(section => section.visible !== false);
  const ids = new Set(['main','about']);
  for (const section of sections) {
    if (!/^[a-z][a-z0-9-]*$/.test(section.id || '') || ids.has(section.id)) throw Error(`栏目地址无效或重复：${section.id}`);
    if (!['projects','cards','text','files'].includes(section.kind)) throw Error(`栏目展示方式无效：${section.kind}`);
    ids.add(section.id);
  }
  const accent = site.accent || '#1856d8';
  if (!/^#[0-9a-f]{6}$/i.test(accent)) throw Error('主题色应为六位十六进制颜色。');
  const label = site.labels || {};
  const hero = site.hero;
  const footer = site.footer || {};
  const link = (url, text, cls = 'card-link') => { if (!url || !text) return ''; const target = safeLink(url, ids); return target ? `<a class="${cls}" href="${escape(target)}">${escape(text)} ${arrow}</a>` : ''; };
  async function picture(src, alt, cls) {
    if (!src) return '';
    const local = uploadPath(src);
    if (!/\.(png|jpe?g|webp|gif|avif)$/i.test(local)) throw Error('头像和栏目图片请使用 PNG、JPEG、WebP、GIF 或 AVIF。');
    await uploadInfo(local);
    return `<img class="${cls}" src="${escape(local.split('/').map(encodeURIComponent).join('/'))}" alt="${escape(alt)}" loading="${cls === 'profile-image' ? 'eager' : 'lazy'}" decoding="async">`;
  }
  const fileRows = [];
  for (const entry of array(files.items)) {
    if (!entry.title || !entry.file) throw Error('文件列表中每项都需要名称和文件。');
    const local = uploadPath(entry.file);
    const info = await uploadInfo(local);
    const bytes = info.size;
    const size = Number.isFinite(bytes) ? (bytes < 1024 ? `${bytes} B` : bytes < 1048576 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1048576).toFixed(1)} MB`) : '';
    const meta = [size, entry.date].filter(Boolean).join(' · ');
    const folderCategory = local.split('/').length > 2 ? local.split('/')[1] : '';
    fileRows.push({category: String(entry.category || folderCategory), html: `<li class="file-row"><div class="file-type">${fileIcon}</div><div class="file-details"><h3 class="file-name">${escape(entry.title)}</h3>${entry.description ? `<p class="file-description text-content">${escape(entry.description)}</p>` : ''}${meta ? `<p class="file-meta">${escape(meta)}</p>` : ''}</div><a class="download-link" href="${escape(local.split('/').map(encodeURIComponent).join('/'))}" download aria-label="${escape(label.download || '下载')} ${escape(entry.title)}">${down}<span>${escape(label.download || '下载')}</span></a></li>`});
  }
  const renderedSections = [];
  for (const section of sections) {
    let body = section.text ? `<p class="text-content">${escape(section.text)}</p>` : '';
    if (section.kind === 'files') {
      const rows = section.fileCategory ? fileRows.filter(row => row.category === section.fileCategory) : fileRows;
      body += rows.length ? `<ul class="file-list">${rows.map(row => row.html).join('')}</ul>` : `<p class="empty-message">${escape(label.emptyFiles)}</p>`;
    }
    else {
      const cards = [];
      for (const [index, item] of array(section.items).entries()) {
        const content = `${await picture(item.image, item.imageAlt || item.title, 'card-image')}${item.meta ? `<p class="item-meta">${escape(item.meta)}</p>` : ''}${item.title ? `<h3>${escape(item.title)}</h3>` : ''}${item.text ? `<p class="text-content">${escape(item.text)}</p>` : ''}${array(item.tags).length ? `<div class="tags">${item.tags.map(tag => `<span>${escape(tag)}</span>`).join('')}</div>` : ''}${link(item.link,item.linkLabel || label.details)}`;
        cards.push(section.kind === 'projects' ? `<article class="research-item"><span class="research-index">${String(index+1).padStart(2,'0')}</span><div>${content}</div></article>` : `<article class="interest-card simple-card"><div>${content}</div></article>`);
      }
      body += cards.join('');
      if (!body) body = `<p class="empty-message">${escape(label.emptySection)}</p>`;
    }
    renderedSections.push(`<section id="${section.id}" class="section-row" aria-labelledby="${section.id}-title"><div class="section-label">${section.kicker ? `<span class="section-number">${escape(section.kicker)}</span>` : ''}<h2 id="${section.id}-title">${escape(section.title)}</h2>${section.intro ? `<p>${escape(section.intro)}</p>` : ''}</div><div class="section-content">${body}</div></section>`);
  }
  const nav = [{id:'about',navLabel:hero.navLabel},...sections].filter(section=>section.navLabel).map(section=>`<a href="#${section.id}">${escape(section.navLabel)}</a>`).join('');
  const contacts = array(site.contacts).map(entry => link(entry.url, entry.label, 'contact-link')).join('');
  const brand = escape(site.brand || hero.name);
  const html = `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escape(site.title)}</title><meta name="description" content="${escape(site.description)}"><meta name="referrer" content="strict-origin-when-cross-origin"><link rel="icon" href="assets/favicon.svg"><link rel="stylesheet" href="assets/site.css"><style>:root{--primary:${accent}}</style></head><body>
<a href="#main" class="skip-link">${escape(label.skip || '跳到正文')}</a><header class="site-header shell"><a class="wordmark" href="#main">${brand}</a><nav aria-label="${escape(label.navigation)}">${nav}</nav>${site.headerLabel ? `<span class="header-note">${escape(site.headerLabel)}</span>`:''}</header>
<main id="main" class="shell"><section id="about" class="hero" aria-labelledby="hero-title"><div>${await picture(hero.avatar,hero.avatarAlt,'profile-image')}${hero.eyebrow ? `<p class="eyebrow">${escape(hero.eyebrow)}</p>`:''}<h1 id="hero-title">${escape(hero.name)}<span>.</span></h1>${hero.role ? `<p class="hero-role">${escape(hero.role)}</p>`:''}</div><div class="hero-note">${hero.greeting ? `<p>${escape(hero.greeting)}</p>`:''}${hero.intro ? `<p class="text-content">${escape(hero.intro)}</p>`:''}${link(hero.link,hero.linkLabel,'text-link')}${contacts ? `<div class="contacts">${contacts}</div>`:''}</div></section>${renderedSections.join('')}</main>
<footer class="site-footer shell"><span>${escape(footer.copyright)}</span><span>${escape(footer.text)}</span><div>${footer.topLabel ? `<a href="#main">${escape(footer.topLabel)} ${arrow}</a>`:''}${footer.adminLabel ? `<a class="management-link" href="admin/">${escape(footer.adminLabel)}</a>`:''}</div></footer></body></html>`;
  const repoValid = /^[a-zA-Z0-9-]+\/[a-zA-Z0-9_.-]+$/.test(repository);
  const cmsUrl = 'https://app.pagescms.org/';
  const repositoryUrl = repoValid ? `https://github.com/${repository}` : '';
  const admin = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>管理网站 · ${escape(site.title)}</title><link rel="stylesheet" href="../assets/site.css"></head><body><main class="admin-panel"><a href="../">← 返回主页</a><h1>管理我的网站</h1><p>使用拥有仓库管理权限的 GitHub 账号登录，即可编辑个人信息、栏目与公开文件。</p><a class="primary-link" href="${cmsUrl}">打开编辑后台 ${arrow}</a>${repoValid ? `<p>登录后选择仓库 <strong>${escape(repository)}</strong>，分支 <strong>${escape(branch)}</strong>。</p><p><a class="text-link" href="${repositoryUrl}">在 GitHub 中查看网站源文件 ${arrow}</a></p>`:''}<p>保存后网站会自动更新，发布通常需要等待几分钟。</p><p>此网站使用公开仓库。请只上传可公开的内容，隐藏栏目不会让仓库内的文件变为私有。</p></main></body></html>`;
  const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="${accent}"/><text x="16" y="47" font-family="Georgia,serif" font-weight="bold" font-size="44" fill="white">${escape(String(site.brand || hero.name).slice(0,2))}</text></svg>`;
  return { html, admin, favicon };
}

export async function build(root = path.resolve(fileURLToPath(new URL('..', import.meta.url)))) {
  const json = async name => JSON.parse(await readFile(path.join(root,'content',`${name}.json`),'utf8'));
  const [site,home,files] = await Promise.all(['site','home','files'].map(json));
  const uploadInfo = async local => {
    const full = path.join(root,uploadPath(local));
    const parts = path.relative(root,full).split(path.sep);
    let current = root;
    for (const part of parts) { current = path.join(current,part); if ((await lstat(current)).isSymbolicLink()) throw Error('上传文件不能是符号链接。'); }
    const info = await stat(full);
    if (!info.isFile()) throw Error(`文件不存在：${local}`);
    if (info.size > 25 * 1024 * 1024) throw Error(`文件超过当前网站设定的 25 MB 上限：${local}`);
    return info;
  };
  const result = await renderSite(site,home,files,uploadInfo,process.env.GITHUB_REPOSITORY || '',process.env.GITHUB_REF_NAME || 'main');
  const out = path.join(root,'_site');
  await rm(out,{recursive:true,force:true});
  await mkdir(path.join(out,'assets'),{recursive:true});
  await mkdir(path.join(out,'admin'),{recursive:true});
  await writeFile(path.join(out,'index.html'),result.html);
  await writeFile(path.join(out,'admin/index.html'),result.admin);
  await writeFile(path.join(out,'assets/favicon.svg'),result.favicon);
  await copyFile(path.join(root,'assets/site.css'),path.join(out,'assets/site.css'));
  async function copyUploads(dir,relative='uploads') {
    await mkdir(path.join(out,relative),{recursive:true});
    for (const entry of await readdir(dir,{withFileTypes:true})) {
      if (entry.name.startsWith('.')) continue;
      const local = `${relative}/${entry.name}`;
      if (entry.isSymbolicLink()) throw Error('上传文件不能是符号链接。');
      if (entry.isDirectory()) await copyUploads(path.join(root,local),local);
      else { await uploadInfo(local); await copyFile(path.join(root,local),path.join(out,local)); }
    }
  }
  await copyUploads(path.join(root,'uploads'));
  await writeFile(path.join(out,'.nojekyll'),'');
  console.log('网站已生成：_site/index.html');
  return result;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { await build(); } catch (error) { console.error('网站生成失败：'+error.message); process.exitCode=1; }
}
