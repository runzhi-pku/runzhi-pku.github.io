import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir, mkdtemp, cp, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build, renderSite, safeLink, uploadPath } from './build.mjs';

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const fixture = async () => Promise.all(['site','home','files'].map(async name => JSON.parse(await readFile(path.join(root,'content',name+'.json'),'utf8'))));

test('栏目可增删、排序，失效站内按钮自动隐藏', async () => {
  const [site,home,files] = await fixture();
  home.sections = home.sections.filter(s => s.id !== 'research').reverse();
  home.sections.unshift({id:'writing',kind:'text',visible:true,title:'我的写作',navLabel:'写作',text:'新增的文字'});
  const {html} = await renderSite(site,home,files);
  assert.ok(html.includes('新增的文字'));
  assert.ok(html.includes('href="#writing"'));
  assert.ok(!html.includes('href="#research"'));
  assert.ok(html.indexOf('id="writing"') < html.indexOf('id="interests"'));
  assert.ok(html.indexOf('id="interests"') < html.indexOf('id="files"'));
});

test('文字转义且拒绝脚本链接和越界文件路径', async () => {
  const [site,home,files] = await fixture();
  site.hero.greeting = '<script>alert("x")</script>';
  const {html} = await renderSite(site,home,files);
  assert.ok(!html.includes('<script>'));
  assert.ok(html.includes('&lt;script&gt;'));
  assert.throws(() => safeLink('javascript:alert(1)'));
  assert.throws(() => safeLink('https://user:secret@example.com'));
  for (const value of ['/uploads/../secret','uploads/a/../../secret','https://example.com/file','uploads/a\\b','uploads/a?x=1']) assert.throws(() => uploadPath(value));
  home.sections.push({...home.sections[0]});
  await assert.rejects(renderSite(site,home,files), /重复/);
});

test('完整生成保留中文文件与空格，下载地址正确，符号链接被拒绝', async () => {
  const temp = await mkdtemp(path.join(tmpdir(),'runzhi-site-'));
  try {
    await cp(path.join(root,'content'),path.join(temp,'content'),{recursive:true});
    await cp(path.join(root,'assets'),path.join(temp,'assets'),{recursive:true});
    await mkdir(path.join(temp,'uploads'));
    const filename = '数学 笔记.txt';
    const local = 'uploads/'+filename;
    await writeFile(path.join(temp,local),'公开的笔记');
    await writeFile(path.join(temp,'content/files.json'),JSON.stringify({items:[{title:'数学笔记',file:'/'+local,description:'课程内容'}]}));
    const {html} = await build(temp);
    const href = 'uploads/'+encodeURIComponent(filename);
    assert.ok(html.includes('href="'+href+'" download'));
    assert.equal(safeLink('/'+local),href);
    assert.equal(await readFile(path.join(temp,'_site',local),'utf8'),'公开的笔记');
    assert.ok(!(await readFile(path.join(temp,'_site/admin/index.html'),'utf8')).includes('password'));
    await symlink(path.join(temp,'content/site.json'),path.join(temp,'uploads/secret.json'));
    await assert.rejects(build(temp), /符号链接/);
  } finally { await rm(temp,{recursive:true,force:true}); }
});
