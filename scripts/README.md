# Release Scripts

Scripts để tự động hóa quy trình tạo release mới với tag và bump version.

## Scripts có sẵn

### Release Script (`release.sh`)

Script tự động hóa toàn bộ quy trình release:
1. Bump version trong `package.json` (patch/minor/major)
2. Build project để đảm bảo không có lỗi
3. Commit thay đổi version
4. Tạo git tag với format `vX.X.X`
5. Push code và tag lên remote
6. Trigger GitHub Actions để build và deploy

## Cách sử dụng

### Sử dụng npm scripts (Khuyến nghị)

```bash
# Patch release (1.0.14 -> 1.0.15) trên branch production
npm run release:patch

# Minor release (1.0.14 -> 1.1.0) trên branch production
npm run release:minor

# Major release (1.0.14 -> 2.0.0) trên branch production
npm run release:major

# Release trên branch development
npm run release:patch:dev
npm run release:minor:dev
npm run release:major:dev
```

### Sử dụng trực tiếp script

```bash
# Cú pháp: ./scripts/release.sh [patch|minor|major] [branch]

# Patch release trên production (mặc định)
./scripts/release.sh patch

# Minor release trên production
./scripts/release.sh minor

# Major release trên production
./scripts/release.sh major

# Patch release trên development
./scripts/release.sh patch development

# Minor release trên development
./scripts/release.sh minor development
```

## Version Types

- **patch**: Bug fixes, không breaking changes
  - `1.0.14` → `1.0.15`
- **minor**: New features, backward compatible
  - `1.0.14` → `1.1.0`
- **major**: Breaking changes
  - `1.0.14` → `2.0.0`

## Quy trình

1. **Kiểm tra**: Script sẽ kiểm tra:
   - Có đang trong git repository không
   - Có uncommitted changes không (sẽ hỏi xác nhận)
   - Branch hiện tại

2. **Switch branch**: Tự động switch sang branch target nếu khác

3. **Pull latest**: Pull code mới nhất từ remote

4. **Bump version**: Tăng version trong `package.json` và `package-lock.json`

5. **Build**: Chạy `npm run build` để đảm bảo code compile được
   - Nếu build fail, sẽ revert version change

6. **Commit**: Commit thay đổi version với message `chore: bump version to X.X.X`

7. **Create tag**: Tạo annotated tag `vX.X.X` với message `Release vX.X.X`

8. **Push**: Hỏi xác nhận trước khi push:
   - Push branch lên remote
   - Push tag lên remote

9. **GitHub Actions**: Sau khi push tag, workflow sẽ tự động:
   - Build Docker images
   - Deploy lên Kubernetes

## Lưu ý

- Script sẽ hỏi xác nhận nếu có uncommitted changes
- Script sẽ hỏi xác nhận trước khi push lên remote
- Nếu build fail, version change sẽ được revert tự động
- Tag phải bắt đầu bằng `v` (ví dụ: `v1.0.15`) để trigger GitHub Actions workflow
- Sau khi push tag, có thể tạo GitHub Release thủ công tại: https://github.com/Eliitme/quackmuzik/releases/new

## Ví dụ

```bash
# Tạo patch release trên production
npm run release:patch

# Output:
# ℹ Starting release process...
# ℹ Version type: patch
# ℹ Target branch: production
# ℹ Current branch: production
# ℹ Pulling latest changes from production...
# ℹ Current version: 1.0.14
# ℹ Bumping patch version...
# ✓ Version bumped: 1.0.14 -> 1.0.15
# ℹ Building project...
# ✓ Build successful
# ℹ Committing version change...
# ✓ Version change committed
# ℹ Creating tag: v1.0.15
# ✓ Tag created: v1.0.15
# ⚠ Ready to push to remote:
#   Branch: production
#   Tag: v1.0.15
# Push to remote? (y/N) y
# ℹ Pushing branch production...
# ✓ Branch pushed
# ℹ Pushing tag v1.0.15...
# ✓ Tag pushed
# ✓ Release completed successfully!
```
