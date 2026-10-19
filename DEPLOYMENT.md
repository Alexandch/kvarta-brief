# Настройка Supabase, Netlify и проверки перед публикацией

## Supabase

1. Войдите в [Supabase Dashboard](https://supabase.com/dashboard) и создайте новый project. Задайте понятное имя, выберите пароль базы и сохраните его в менеджере паролей. Этот пароль не получится посмотреть повторно в панели; если потеряете, задайте новый и замените строку подключения в Netlify.
2. Выберите регион, подходящий для целевой аудитории, и дождитесь, пока проект завершит Provisioning. Для лендинга кофейни заявки будут содержать имя, телефон, комментарий и рекламные метки, поэтому используйте пароль базы только на сервере.
3. Откройте **SQL Editor → New query**. В репозитории откройте `db/init/001_create_leads.sql`, скопируйте файл целиком в редактор Supabase и нажмите **Run** (или `Ctrl+Enter`). Успешное выполнение создаст `public.leads`, индекс, функцию сохранения заявки, включит RLS и закроет публичный вызов функции. Скрипт можно безопасно запускать повторно при повторной настройке.
4. Проверьте результат через **Table Editor → public → leads**. Таблица будет пустой до первой заявки. Для проверки RLS можно выполнить в SQL Editor:

   ```sql
   select relrowsecurity
   from pg_class
   where oid = 'public.leads'::regclass;
   ```

   Значение `true` означает, что Row Level Security включён. Публичные политики для чтения или изменения заявок не создавайте: сайт отправляет форму на собственный Next.js API, а сервер записывает данные в PostgreSQL.
5. Чтобы получить production-подключение, нажмите **Connect** вверху проекта, выберите **Transaction pooler** / transaction mode и скопируйте выданный URI целиком. У него обычно порт `6543`, а имя пользователя содержит суффикс проекта (`postgres.<project-ref>`). Не собирайте адрес и имя пользователя вручную: копируйте значения из панели.
6. В URI замените `[YOUR-PASSWORD]` на пароль базы. Если в пароле есть зарезервированные URL символы (`@`, `#`, `?`, `/`, `%`, пробел и другие), закодируйте их для URL. Затем добавьте `sslmode=require`: если в строке ещё нет `?`, добавьте `?sslmode=require`; если параметры уже есть — `&sslmode=require`.
7. Передайте готовую строку только в Netlify как секретную environment variable `DATABASE_URL`. Не добавляйте её в GitHub Actions secrets, исходники, скриншоты, issue или `netlify.toml`; workflow использует свою одноразовую тестовую PostgreSQL. При случайной публикации пароля сбросьте пароль базы и обновите `DATABASE_URL` в Netlify.

Для Netlify Functions нужен именно transaction mode: функции создают короткие соединения. В transaction mode нельзя использовать подготовленные именованные запросы; текущий API отправляет обычный unnamed `pg` query и ограничивает клиентский pool одним соединением на тёплый экземпляр.

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

CI выполняет три замера Lighthouse мобильного профиля на собранной production-странице. HTML и JSON сохраняются как artifact `lighthouse-mobile-<commit>` в GitHub Actions run на 30 дней. [Отчёт первого успешного мобильного замера](https://github.com/Alexandch/kvarta-brief/actions/runs/39269644634) доступен внизу страницы запуска, в разделе **Artifacts**. В дальнейшем откройте **Actions → Verify and deploy → последний запуск → Artifacts**, чтобы скачать свежие отчёты. Scores зависят от runner, сети и загрузки внешних изображений; отчёт содержит и score, и подробности проверок. Локально Lighthouse запускается после `npm run build` командой `npm run lighthouse`, отчёты сохраняются в `artifacts/lighthouse/`.
