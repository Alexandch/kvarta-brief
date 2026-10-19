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

### Создание проекта и поля импорта

1. Откройте Netlify и выберите свою Team → **Add new project → Import an existing project**.
2. Выберите **GitHub**. Если Netlify предложит установить GitHub App, разрешите доступ к репозиторию `Alexandch/kvarta-brief` (лучше выбрать доступ только к этому репозиторию), затем выберите его в списке.
3. Укажите параметры проекта:

   | Поле | Что указать |
   | --- | --- |
   | Project/site name | Например, `kvarta-coffee`; имя должно быть свободно в Netlify. Оно задаёт адрес вида `kvarta-coffee.netlify.app`. |
   | Production branch | `main` |
   | Base directory | Оставить пустым (корень репозитория) |
   | Package directory, если показывается | `.` или корень репозитория |
   | Build command | `npm run build` — такое значение уже задано в `netlify.toml` |
   | Publish directory | Оставить предложенное Netlify значение для Next.js; если поле требует ввода — `.next` |
   | Functions directory, если показывается | Оставить автоматическую настройку |

   Приложение Next.js и `package.json` находятся в корне репозитория. В проекте используется Next.js App Router и API route для отправки формы; Netlify поддерживает их своим Next.js адаптером. Не задавайте `out`: эта папка предназначена для статического экспорта, а наш сайт использует серверный API. Версия Node уже установлена как `22` в `netlify.toml`.

4. Нажмите **Deploy site**. Импорт репозитория может сразу запустить первый deploy. После создания сайта выполните шаг «Остановить автоматические сборки» ниже. Если Supabase ещё не настроен, форма отправки заявок заработает после установки `DATABASE_URL` и следующего production deploy.

Netlify автоматически подставляет предложенные build settings при распознавании фреймворка. Для Next.js типичны команда `next build` и папка `.next`; в репозитории команда записана как `npm run build`, которая вызывает `next build`. См. [импорт репозитория в Netlify](https://docs.netlify.com/manage/projects/add-new-project/) и [инструкцию Netlify для Next.js](https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview/).

### Настроить базу и публикацию

1. В Netlify откройте **Project configuration → Environment variables → Add a variable** и добавьте:
   - **Key:** `DATABASE_URL`;
   - **Value:** полная строка подключения Supabase Transaction pooler с заменённым паролем и `sslmode=require` (см. раздел Supabase выше);
   - **Deploy context:** `Production`;
   - **Scopes:** `Functions`.

   Не добавляйте префикс `NEXT_PUBLIC_`: строка содержит пароль и используется только серверным API. Для этого проекта достаточно scope `Functions`, потому что запрос к базе выполняется при отправке формы, а не во время сборки. Не помещайте `DATABASE_URL` в GitHub Secrets, `netlify.toml`, исходники или сообщения. Изменения переменных вступают в силу после следующего deploy. Подробности есть в [документации переменных Netlify](https://docs.netlify.com/build/environment-variables/get-started/).

2. Чтобы Netlify не публиковал commit параллельно с проверками GitHub Actions, откройте **Project configuration → Developer settings → Continuous deployment → Build settings → Configure** и установите **Build status → Stopped builds**. Оставьте GitHub repository подключённым. Остановка отключает Git-triggered builds, Deploy Previews и branch deploys в Netlify; команда `netlify deploy --build --prod` из нашего GitHub Actions workflow по-прежнему может выполнить ручную публикацию. Это позволяет выкладывать production только после успешных тестов, сборки и Lighthouse. Не нажимайте **Activate builds** без необходимости: это вернёт сборки по push в Netlify. См. [Stop or activate builds](https://docs.netlify.com/build/configure-builds/stop-or-activate-builds/).

3. Скопируйте **Site ID** (в новых экранах также может называться **Project ID**): **Project configuration → General → Project details → Project information → Project ID**.
4. Создайте токен: аватар профиля → **User settings → Applications → Personal access tokens → New access token**. Назовите его, например, `kvarta-github-actions`, выберите срок действия и скопируйте значение сразу после создания.
5. В GitHub откройте репозиторий `Alexandch/kvarta-brief` → **Settings → Secrets and variables → Actions → New repository secret** и добавьте:
   - `NETLIFY_AUTH_TOKEN` — токен Netlify;
   - `NETLIFY_SITE_ID` — Site/Project ID.

   Это единственные Netlify credentials, нужные workflow. `DATABASE_URL` остаётся в Netlify, потому что workflow тестирует API на отдельной временной PostgreSQL.

6. Следующий push в `main` запустит workflow `.github/workflows/ci.yml`: сначала unit и integration tests, typecheck, production build и Lighthouse, затем deploy job опубликует production через Netlify CLI, только если проверки прошли. До добавления обоих GitHub Secrets тесты будут выполняться, а deploy будет пропускаться.
7. После успешной публикации откройте production URL и отправьте тестовую заявку. Проверьте её в Supabase **Table Editor → public.leads**, затем удалите тестовую строку. Используйте отдельный тестовый номер и никогда не запускайте интеграционные проверки против production базы.

Site ID и Personal access token нужны Netlify CLI для адресной публикации в нужный проект; см. [Get started with Netlify CLI](https://docs.netlify.com/api-and-cli-guides/cli-guides/get-started-with-cli/). Настроенная защита `main` должна требовать статус **Tests, build, and mobile Lighthouse**.

## Тесты и CI/CD

`npm run test:unit` проверяет преобразование телефонного номера и разрешённые префиксы. `npm run test:integration` применяет схему к выделенной тестовой PostgreSQL, запускает production-сборку Next.js и проверяет HTTP API: валидацию, запись заявки и UTM, фильтрацию неизвестных attribution полей и конфликт повторной отправки. Для локального прогона интеграционных тестов задайте `DATABASE_URL` из отдельной тестовой БД.

Workflow `.github/workflows/ci.yml` запускается на Pull Request и push в `main`. Он поднимает временную PostgreSQL 17, выполняет unit и integration тесты, проверку TypeScript и production build. На push в `main` Netlify deploy job запускается после успешного verify job. Если secrets Netlify ещё не заданы, проверка пройдёт, но публикация будет пропущена.

## Lighthouse mobile

CI выполняет три замера Lighthouse мобильного профиля на собранной production-странице. HTML и JSON сохраняются как artifact `lighthouse-mobile-<commit>` в GitHub Actions run на 30 дней. [Отчёт первого успешного мобильного замера](https://github.com/Alexandch/kvarta-brief/actions/runs/39269644634) доступен внизу страницы запуска, в разделе **Artifacts**. В дальнейшем откройте **Actions → Verify and deploy → последний запуск → Artifacts**, чтобы скачать свежие отчёты. Scores зависят от runner, сети и загрузки внешних изображений; отчёт содержит и score, и подробности проверок. Локально Lighthouse запускается после `npm run build` командой `npm run lighthouse`, отчёты сохраняются в `artifacts/lighthouse/`.
