# Настройка Supabase, Netlify и проверки перед публикацией

## Supabase

1. Создайте проект в Supabase и сохраните пароль базы в менеджере паролей.
2. Откройте **SQL Editor**, вставьте содержимое `db/init/001_create_leads.sql` и выполните один раз. В Table Editor должна появиться таблица `public.leads`.
3. Откройте **Connect** и скопируйте строку **Transaction pooler** (Shared Pooler). Этот режим рассчитан на короткие подключения serverless-функций. Подставьте пароль базы, закодируйте специальные символы в URL и добавьте `?sslmode=require` (либо `&sslmode=require`, если параметры уже есть).
4. Не используйте прямой URL подключения для Netlify Function и не помещайте URL с паролем в Git. Локально применяется Compose PostgreSQL, для production — Supabase.

## Netlify

1. Создайте сайт в Netlify и возьмите **Site ID** из настроек сайта.
2. В **Project configuration → Environment variables** задайте `DATABASE_URL` со строкой Supabase. Укажите production context и scopes **Functions** и **Builds**. Netlify Functions получают переменные из панели Netlify; значения из `netlify.toml` туда не передаются.
3. В **Build & deploy → Continuous deployment** отключите автоматическую публикацию commit из Git. Репозиторий остаётся на GitHub, но production publish выполняет workflow только после проверок.
4. Создайте Netlify **Personal access token** для GitHub Actions.
5. В GitHub откройте **Settings → Secrets and variables → Actions** и добавьте:
   - `NETLIFY_AUTH_TOKEN` — Netlify personal access token;
   - `NETLIFY_SITE_ID` — Site ID сайта.
6. Проверьте, что Actions разрешены в **Settings → Actions → General**. Настроенная защита `main` должна требовать статус **Tests, build, and mobile Lighthouse**.
7. После успешного workflow откройте production URL и отправьте тестовую заявку. Проверьте её в Supabase **Table Editor → public.leads**, после чего удалите тестовую строку. Тестируйте отдельным номером и никогда не запускайте интеграционные проверки против production базы.

Официальные страницы: [Next.js на Netlify](https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview/), [переменные окружения Netlify Functions](https://docs.netlify.com/build/functions/environment-variables/), [подключение к PostgreSQL Supabase](https://supabase.com/docs/guides/database/connecting-to-postgres).

## Тесты и CI/CD

`npm run test:unit` проверяет преобразование телефонного номера и разрешённые префиксы. `npm run test:integration` применяет схему к выделенной тестовой PostgreSQL, запускает production-сборку Next.js и проверяет HTTP API: валидацию, запись заявки и UTM, фильтрацию неизвестных attribution полей и конфликт повторной отправки. Для локального прогона интеграционных тестов задайте `DATABASE_URL` из отдельной тестовой БД.

Workflow `.github/workflows/ci.yml` запускается на Pull Request и push в `main`. Он поднимает временную PostgreSQL 17, выполняет unit и integration тесты, проверку TypeScript и production build. На push в `main` Netlify deploy job запускается после успешного verify job. Если secrets Netlify ещё не заданы, проверка пройдёт, но публикация будет пропущена.

## Lighthouse mobile

CI выполняет три замера Lighthouse мобильного профиля на собранной production-странице. HTML и JSON сохраняются как artifact `lighthouse-mobile-<commit>` в GitHub Actions run на 30 дней. Откройте **Actions → Verify and deploy → последний запуск → Artifacts**, чтобы скачать отчёты. Scores зависят от runner, сети и загрузки внешних изображений; отчёт содержит и score, и подробности проверок. Локально Lighthouse запускается после `npm run build` командой `npm run lighthouse`, отчёты сохраняются в `artifacts/lighthouse/`.
