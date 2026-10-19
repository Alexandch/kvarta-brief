"use client";

import { FormEvent, useEffect, useRef, useState } from "react";

const coffees = [
  {
    origin: "01 / ЭФИОПИЯ",
    name: "Иргачеффе",
    tasting: "Жасмин · бергамот · персик",
    note: "Чистая, цветочная чашка. Хороша и в фильтре, и просто утром.",
    price: "32",
    color: "sage",
    photo: "https://images.unsplash.com/photo-1442512595331-e89e73853f31?auto=format&fit=crop&w=900&q=82",
    alt: "Кофейные ягоды и зерна в естественном свете",
  },
  {
    origin: "02 / КОЛУМБИЯ",
    name: "Уила",
    tasting: "Карамель · красное яблоко",
    note: "Тёплый, понятный вкус без лишней кислоты. Наш выбор на каждый день.",
    price: "29",
    color: "clay",
    photo: "https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=900&q=82",
    alt: "Свежесваренный кофе в керамической чашке",
  },
  {
    origin: "03 / БРАЗИЛИЯ",
    name: "Серрадо",
    tasting: "Орех · шоколад · эспрессо",
    note: "Плотное тело и шоколадное послевкусие. Особенно хорош с молоком.",
    price: "26",
    color: "gold",
    photo: "https://images.unsplash.com/photo-1559056199-641a0ac8b55e?auto=format&fit=crop&w=900&q=82",
    alt: "Обжаренные кофейные зерна для эспрессо",
  },
];

type LeadPayload = {
  name: string;
  phone: string;
  interest: string;
  comment: string;
  attribution: Record<string, string>;
};

export default function Landing() {
  const formRef = useRef<HTMLElement>(null);
  const [interest, setInterest] = useState("Подписка на кофе");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [comment, setComment] = useState("");
  const [formState, setFormState] = useState<"idle" | "sending" | "success" | "error" | "duplicate">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [attribution, setAttribution] = useState<Record<string, string>>({});

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const stored = sessionStorage.getItem("kvarta-attribution");
    const previous = stored ? JSON.parse(stored) as Record<string, string> : {};
    const current: Record<string, string> = {
      landingPage: previous.landingPage || window.location.pathname,
      referrer: previous.referrer || document.referrer || "direct",
    };
    for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "gclid", "fbclid", "yclid"]) {
      const value = params.get(key);
      if (value) current[key] = value;
      else if (previous[key]) current[key] = previous[key];
    }
    sessionStorage.setItem("kvarta-attribution", JSON.stringify(current));
    setAttribution(current);
  }, []);

  function focusForm(nextInterest?: string) {
    if (nextInterest) setInterest(nextInterest);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    setMobileMenuOpen(false);
  }

  function checkPhone(value: string) {
    const digits = value.replace(/\D/g, "");
    return /^375(?:25|29|33|44)\d{7}$/.test(digits);
  }

  async function submitLead(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormState("idle");
    if (!checkPhone(phone)) {
      setPhoneError("Нужен белорусский мобильный номер: +375 29 123-45-67");
      document.getElementById("phone")?.focus();
      return;
    }
    setPhoneError("");
    setFormState("sending");
    setErrorMessage("");
    const payload: LeadPayload = {
      name: name.trim(),
      phone: `+${phone.replace(/\D/g, "")}`,
      interest,
      comment: comment.trim(),
      attribution: { ...attribution, submittedPage: window.location.pathname },
    };
    try {
      const response = await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json() as { error?: string };
      if (response.status === 409) {
        setFormState("duplicate");
      } else if (!response.ok) {
        setErrorMessage(result.error || "Не удалось отправить заявку. Попробуйте ещё раз.");
        setFormState("error");
      } else {
        setFormState("success");
        setName("");
        setPhone("");
        setComment("");
      }
    } catch {
      setErrorMessage("Связь прервалась. Проверьте интернет и отправьте заявку ещё раз.");
      setFormState("error");
    }
  }

  return (
    <main>
      <div className="topline">
        <div className="topline-inner">
          <span>МИНСК · МАЛЕНЬКАЯ ОБЖАРКА С 2019</span>
          <span className="topline-right">ЧЕТВЕРГ И ПЯТНИЦА — ДНИ ОБЖАРКИ <i aria-hidden="true">✳</i></span>
        </div>
      </div>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="Кварта, кофейная мастерская — на главную">
          <span className="brand-mark" aria-hidden="true">к<span>•</span></span>
          <span className="brand-word">кварта<small>КОФЕЙНАЯ МАСТЕРСКАЯ</small></span>
        </a>
        <button className="menu-toggle" type="button" aria-expanded={mobileMenuOpen} aria-label={mobileMenuOpen ? "Закрыть меню" : "Открыть меню"} onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
          <span /><span />
        </button>
        <nav className={mobileMenuOpen ? "main-nav open" : "main-nav"} aria-label="Основная навигация">
          <a href="#coffee" onClick={() => setMobileMenuOpen(false)}>Кофе</a>
          <a href="#about" onClick={() => setMobileMenuOpen(false)}>Как мы работаем</a>
          <a href="#delivery" onClick={() => setMobileMenuOpen(false)}>Доставка</a>
        </nav>
        <button className="header-cta" type="button" onClick={() => focusForm()}>Оставить заявку <span aria-hidden="true">↗</span></button>
      </header>

      <section className="hero" id="top" aria-labelledby="hero-title">
        <div className="hero-copy">
          <div className="eyebrow"><span className="eyebrow-line" /> КОФЕ СВЕЖЕЙ ОБЖАРКИ · МИНСК</div>
          <h1 id="hero-title">Кофе,<br />которому нужно<br /><em>немного</em> времени.</h1>
          <p className="hero-lead">Обжариваем маленькими партиями, чтобы зерно успело раскрыться, а у вас — появился свой вкус.</p>
          <div className="hero-actions">
            <a className="button button-dark" href="#coffee">Выбрать кофе <span aria-hidden="true">↓</span></a>
            <span className="hero-note">Зёрна доезжают к вам<br />через 1–3 дня после обжарки</span>
          </div>
          <div className="hero-stamp" aria-label="Обжариваем с 2019 года"><span>ОБЖАРИВАЕМ</span><b>С 2019</b><span>В МИНСКЕ</span></div>
        </div>
        <div className="hero-image" role="img" aria-label="Утренний кофе и свежие зёрна на столе">
          <div className="hero-image-shade" />
          <div className="hero-image-caption"><span>ПАРТИЯ № 042</span><span>ЭФИОПИЯ · ИРГАЧЕФФЕ</span></div>
          <div className="hero-label"><span>Новая<br />обжарка</span><b>04</b></div>
        </div>
        <div className="hero-bottom"><span>ДЛЯ ТИХОГО УТРА И ДЛИННЫХ РАЗГОВОРОВ</span><span>КРУТИТЕ КОЛЁСИКО — МЫ НЕ ПРОТИВ <b>↓</b></span></div>
      </section>

      <section className="intro-strip" id="about">
        <div className="intro-number">01 <span>—</span> НАША РАБОТА</div>
        <p>Не гонимся за объёмом.<br /><em>Ищем вкус в каждом зерне.</em></p>
        <div className="intro-aside">Аня и Дмитрий. Раньше — за стойкой, теперь — у ростера. Обжариваем кофе в Минске с 2019 года.</div>
      </section>

      <section className="coffee-section section-pad" id="coffee" aria-labelledby="coffee-title">
        <div className="section-heading">
          <div><div className="eyebrow"><span className="eyebrow-line" /> СЕЙЧАС В РОСТЕРЕ</div><h2 id="coffee-title">Найти свой<br /><em>ритм.</em></h2></div>
          <p>Три зерна — три разных утра. Каждое обжариваем только под заказ и даём ему немного отдохнуть.</p>
        </div>
        <div className="coffee-grid">
          {coffees.map((coffee) => (
            <article className={`coffee-card ${coffee.color}`} key={coffee.name}>
              <div className="coffee-photo" style={{ backgroundImage: `url('${coffee.photo}')` }} role="img" aria-label={coffee.alt}>
                <span className="origin-tag">{coffee.origin}</span>
                <span className="roast-icon" aria-hidden="true">✳</span>
              </div>
              <div className="coffee-info">
                <div className="coffee-title-row"><h3>{coffee.name}</h3><span className="price">{coffee.price}<small> BYN</small></span></div>
                <p className="tasting">{coffee.tasting}</p>
                <p className="coffee-note">{coffee.note}</p>
                <button className="text-link" type="button" onClick={() => focusForm(coffee.name)}>Выбрать это зерно <span aria-hidden="true">↗</span></button>
              </div>
            </article>
          ))}
        </div>
        <div className="coffee-footnote"><span>ЦЕНА ЗА 250 Г · В ЗЁРНАХ ИЛИ ПОМОЛЕМ ПОД ВАШ СПОСОБ</span><span>МОЛОТЬ? РЕШИМ ПО ТЕЛЕФОНУ.</span></div>
      </section>

      <section className="subscription">
        <div className="subscription-photo" role="img" aria-label="Чашка кофе среди свежих кофейных зёрен" />
        <div className="subscription-content">
          <div className="eyebrow eyebrow-light"><span className="eyebrow-line" /> ЕСЛИ КОФЕ ЗАКАНЧИВАЕТСЯ СЛИШКОМ ВОВРЕМЯ</div>
          <h2>Пусть хорошее<br /><em>повторяется.</em></h2>
          <p>Две пачки по 250 г раз в месяц. Свежая обжарка, бесплатная доставка по Минску и никаких напоминаний поставить кофе в список покупок.</p>
          <div className="subscription-bottom"><div className="subscription-price">54 <small>BYN / месяц</small></div><button className="button button-light" type="button" onClick={() => focusForm("Подписка на кофе")}>Попробовать подписку <span aria-hidden="true">↗</span></button></div>
          <span className="subscription-mark" aria-hidden="true">К</span>
        </div>
      </section>

      <section className="story section-pad">
        <div className="story-left"><div className="eyebrow"><span className="eyebrow-line" /> СНАЧАЛА ЗЕРНО</div><h2>Свежесть —<br /><em>не слово на пачке.</em></h2><div className="story-photo" role="img" aria-label="Ручная обжарка кофе небольшими партиями" /></div>
        <div className="story-right">
          <p className="story-lead">Это понятная дата и короткий путь до вашей чашки.</p>
          <div className="story-step"><span>А</span><div><b>Находим своё</b><p>Выбираем зерно, которое хочется заваривать снова. Понимаем, откуда оно приехало и что в нём интересного.</p></div></div>
          <div className="story-step"><span>Б</span><div><b>Обжариваем здесь</b><p>Небольшими партиями в мастерской на Короля. По четвергам и пятницам, чтобы не копить кофе на полке.</p></div></div>
          <div className="story-step"><span>В</span><div><b>Даём отдохнуть</b><p>Упаковываем после обжарки. Обычно зёрна оказываются у вас через один–три дня — как раз ко времени.</p></div></div>
          <a className="text-link story-link" href="#delivery">Узнать про доставку <span aria-hidden="true">↓</span></a>
        </div>
      </section>

      <section className="delivery-section" id="delivery">
        <div className="delivery-top">
          <div className="eyebrow"><span className="eyebrow-line" /> ЗАБЕРЁМ ЗА ВАС ЭТОТ ВОПРОС</div>
          <h2>Кофе сам<br /><em>не приедет.</em></h2>
        </div>
        <div className="delivery-options">
          <article className="delivery-option"><span className="option-index">01</span><div><h3>Самовывоз</h3><p>Минск, ул. Короля, 9.<br />Забрать можно в мастерской.</p><span className="option-meta">ПН–ПТ 8:00–20:00 · СБ–ВС 10:00–18:00</span></div><span className="option-arrow">↗</span></article>
          <article className="delivery-option"><span className="option-index">02</span><div><h3>Доставка</h3><p>По Минску — по пятницам.<br />От 50 BYN привезём бесплатно.</p><span className="option-meta">ДРУГИЕ ВАРИАНТЫ ОБСУДИМ</span></div><span className="option-arrow">↗</span></article>
        </div>
        <div className="delivery-note"><span>СВЕЖЕСТЬ ТЕРПЕЛИВА.</span><span>МЫ ТОЖЕ.</span></div>
      </section>

      <section className="order-section section-pad" ref={formRef} id="order">
        <div className="order-copy"><div className="eyebrow"><span className="eyebrow-line" /> БЕЗ КОРЗИНЫ И ЛИШНИХ ШАГОВ</div><h2>Давайте<br /><em>знакомиться.</em></h2><p>Оставьте номер — Аня или Дима перезвонят в течение 10 минут в рабочее время и помогут с выбором.</p><div className="order-hours"><span>ОБЫЧНО МЫ НА СВЯЗИ</span><b>ПН–ПТ · 8:00–20:00</b></div><div className="order-doodle" aria-hidden="true">↘</div></div>
        <form className="lead-form" onSubmit={submitLead} noValidate>
          <div className="form-heading"><span>ВАШ БУДУЩИЙ КОФЕ</span><span className="form-asterisk" aria-hidden="true">✳</span></div>
          <label htmlFor="name">Как к вам обращаться? <span>*</span></label>
          <input id="name" name="name" autoComplete="name" placeholder="Имя" value={name} onChange={(event) => setName(event.target.value)} required maxLength={80} />
          <label htmlFor="phone">Номер для звонка <span>*</span></label>
          <input id="phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="+375 29 123-45-67" value={phone} onChange={(event) => { setPhone(event.target.value); setPhoneError(""); }} aria-invalid={Boolean(phoneError)} aria-describedby={phoneError ? "phone-error" : "phone-hint"} required />
          {phoneError ? <span id="phone-error" className="field-error">{phoneError}</span> : <span id="phone-hint" className="field-hint">Белорусский мобильный номер</span>}
          <label htmlFor="interest">Что вас заинтересовало?</label>
          <select id="interest" name="interest" value={interest} onChange={(event) => setInterest(event.target.value)}>
            <option value="Подписка на кофе">Подписка на кофе</option>
            <option value="Разовый заказ">Разовый заказ</option>
            <option value="Вопрос по кофе">Вопрос по кофе</option>
            <option value="Иргачеффе">Эфиопия Иргачеффе</option>
            <option value="Уила">Колумбия Уила</option>
            <option value="Серрадо">Бразилия Серрадо</option>
            <option value="Пока присматриваюсь">Пока присматриваюсь</option>
          </select>
          <label htmlFor="comment">Можно добавить пару слов</label>
          <textarea id="comment" name="comment" placeholder="Например, как вы завариваете кофе" value={comment} onChange={(event) => setComment(event.target.value)} rows={2} maxLength={500} />
          <button className="button button-dark form-submit" type="submit" disabled={formState === "sending"}>{formState === "sending" ? "Отправляем…" : "Оставить заявку"}<span aria-hidden="true">↗</span></button>
          <p className="form-privacy">Нажимая кнопку, вы соглашаетесь на связь по вашему вопросу. Никаких рассылок.</p>
          {formState === "success" && <p className="form-feedback success" role="status">Готово! Скоро перезвоним и всё обсудим.</p>}
          {formState === "duplicate" && <p className="form-feedback" role="status">Мы уже получили ваш номер. Если прошло меньше 10 минут, подождите звонка — вторая заявка не нужна.</p>}
          {formState === "error" && <p className="form-feedback error" role="alert">{errorMessage}</p>}
        </form>
      </section>

      <footer className="site-footer">
        <a className="brand brand-footer" href="#top"><span className="brand-mark" aria-hidden="true">к<span>•</span></span><span className="brand-word">кварта<small>КОФЕЙНАЯ МАСТЕРСКАЯ</small></span></a>
        <span className="footer-address">МИНСК, УЛ. КОРОЛЯ, 9<br />КОФЕ, КОТОРОМУ НУЖНО ВРЕМЯ.</span>
        <a className="back-top" href="#top">В НАЧАЛО <span aria-hidden="true">↑</span></a>
        <span className="footer-copy">© КВАРТА · 2019—2026</span>
      </footer>
    </main>
  );
}
