const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");

admin.initializeApp();

// Gmail アプリパスワードを Secret Manager で管理
const gmailPassword = defineSecret("GMAIL_APP_PASSWORD");

/**
 * contacts コレクションに新しいドキュメントが作成されたら
 * メール通知を送信する
 */
exports.onContactCreated = onDocumentCreated(
  {
    document: "contacts/{docId}",
    secrets: [gmailPassword],
  },
  async (event) => {
    const data = event.data.data();
    const name = data.name || "(名前なし)";
    const email = data.email || "(メールなし)";
    const message = data.message || "(本文なし)";
    const createdAt = data.createdAt
      ? data.createdAt.toDate().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })
      : "不明";

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "sugawara.yuuki@gmail.com",
        pass: gmailPassword.value(),
      },
    });

    const mailOptions = {
      from: '"志津川なつかしマップ" <sugawara.yuuki@gmail.com>',
      to: "sugawara.yuuki@gmail.com",
      replyTo: email,
      subject: `【志津川なつかしマップ】お問い合わせ（${name}）`,
      text: [
        "志津川なつかしマップにお問い合わせがありました。",
        "",
        `お名前: ${name}`,
        `メールアドレス: ${email}`,
        `日時: ${createdAt}`,
        "",
        "--- ききたいこと ---",
        message,
        "",
        "---",
        "このメールは自動送信です。",
        `返信は ${email} 宛にお願いします。`,
      ].join("\n"),
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log("問い合わせ通知メール送信完了:", event.params.docId);
    } catch (err) {
      console.error("メール送信失敗:", err);
    }
  }
);
