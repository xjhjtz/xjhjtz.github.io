@echo off
git add .
git commit -m "📝 更新博客"
git push origin master
echo ✅ 已推送，等待 GitHub Actions 自动部署...
pause