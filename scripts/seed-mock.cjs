/* Local-only mock data seeder for the useSend fork dev DB. Never run in prod. */
const { PrismaClient } = require(
  require("path").join(process.cwd(), "node_modules/@prisma/client")
);
const db = new PrismaClient();

function iso(d) {
  return d.toISOString().split("T")[0];
}

async function main() {
  const team = await db.team.findFirst();
  if (!team) throw new Error("No team found — log in first");
  const teamId = team.id;
  console.log("Seeding team", teamId, team.name);

  // ---- Domain ----
  const domain = await db.domain.upsert({
    where: { name: "send.alisamadii.com" },
    update: { status: "SUCCESS", dkimStatus: "SUCCESS", spfDetails: "SUCCESS" },
    create: {
      name: "send.alisamadii.com",
      teamId,
      status: "SUCCESS",
      region: "us-west-2",
      publicKey: "mock-public-key",
      dkimStatus: "SUCCESS",
      spfDetails: "SUCCESS",
      dmarcAdded: true,
      clickTracking: true,
      openTracking: true,
    },
  });

  // ---- Extra dummy domains (varied statuses) ----
  const extraDomains = [
    { name: "mail.brightwave.io", status: "SUCCESS", dkimStatus: "SUCCESS", spfDetails: "SUCCESS", dmarcAdded: true, region: "us-east-1" },
    { name: "send.northpeak.co", status: "PENDING", dkimStatus: "PENDING", spfDetails: "PENDING", dmarcAdded: false, region: "us-west-2" },
    { name: "notifications.lumen.app", status: "SUCCESS", dkimStatus: "SUCCESS", spfDetails: "SUCCESS", dmarcAdded: true, region: "eu-west-1" },
    { name: "updates.harborline.com", status: "FAILED", dkimStatus: "FAILED", spfDetails: "FAILED", dmarcAdded: false, region: "us-east-1", errorMessage: "DKIM records not found on DNS" },
  ];
  for (const dm of extraDomains) {
    await db.domain.upsert({
      where: { name: dm.name },
      update: {
        status: dm.status,
        dkimStatus: dm.dkimStatus,
        spfDetails: dm.spfDetails,
        dmarcAdded: dm.dmarcAdded,
        errorMessage: dm.errorMessage ?? null,
      },
      create: {
        name: dm.name,
        teamId,
        status: dm.status,
        region: dm.region,
        publicKey: "mock-public-key",
        dkimStatus: dm.dkimStatus,
        spfDetails: dm.spfDetails,
        dmarcAdded: dm.dmarcAdded,
        errorMessage: dm.errorMessage ?? null,
        clickTracking: dm.status === "SUCCESS",
        openTracking: dm.status === "SUCCESS",
      },
    });
  }

  // ---- 30 days of DailyEmailUsage (chart) ----
  await db.dailyEmailUsage.deleteMany({ where: { teamId } });
  let totDelivered = 0,
    totHardBounced = 0,
    totComplained = 0;
  for (let i = 0; i < 30; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const date = iso(d);
    // weekly rhythm: bigger sends Tue/Thu
    const day = d.getDay();
    const base = day === 2 || day === 4 ? 320 : day === 0 || day === 6 ? 60 : 150;
    const jitter = Math.floor(((i * 7919) % 53) - 26);
    const sent = Math.max(20, base + jitter);
    const bounced = Math.round(sent * 0.012);
    const hardBounced = Math.max(0, Math.round(bounced * 0.6));
    const complained = i % 9 === 0 ? 1 : 0;
    const delivered = sent - bounced;
    const opened = Math.round(delivered * 0.46);
    const clicked = Math.round(opened * 0.27);
    totDelivered += delivered;
    totHardBounced += hardBounced;
    totComplained += complained;
    const split = (n, ratio) => [Math.round(n * ratio), n - Math.round(n * ratio)];
    const [mSent, tSent] = split(sent, 0.8);
    const [mDel, tDel] = split(delivered, 0.8);
    const [mOp, tOp] = split(opened, 0.85);
    const [mCl, tCl] = split(clicked, 0.9);
    for (const [type, s, del, op, cl] of [
      ["MARKETING", mSent, mDel, mOp, mCl],
      ["TRANSACTIONAL", tSent, tDel, tOp, tCl],
    ]) {
      await db.dailyEmailUsage.create({
        data: {
          teamId,
          domainId: domain.id,
          date,
          type,
          sent: s,
          delivered: del,
          opened: op,
          clicked: cl,
          bounced: type === "MARKETING" ? bounced : 0,
          complained: type === "MARKETING" ? complained : 0,
          hardBounced: type === "MARKETING" ? hardBounced : 0,
        },
      });
    }
  }

  // ---- CumulatedMetrics (bounce/complaint rates) ----
  await db.cumulatedMetrics.upsert({
    where: { teamId_domainId: { teamId, domainId: domain.id } },
    update: {
      delivered: BigInt(totDelivered),
      hardBounced: BigInt(totHardBounced),
      complained: BigInt(totComplained),
    },
    create: {
      teamId,
      domainId: domain.id,
      delivered: BigInt(totDelivered),
      hardBounced: BigInt(totHardBounced),
      complained: BigInt(totComplained),
    },
  });

  // ---- Contact book + contacts ----
  const existingBook = await db.contactBook.findFirst({
    where: { teamId, name: "Newsletter" },
  });
  const book =
    existingBook ??
    (await db.contactBook.create({
      data: {
        name: "Newsletter",
        teamId,
        properties: {},
        emoji: "📬",
      },
    }));
  const firstNames = ["Sarah", "James", "Maria", "David", "Emma", "Michael", "Olivia", "Daniel", "Sophia", "Chris", "Laura", "Kevin", "Nina", "Tom", "Rachel", "Alex", "Julia", "Mark", "Anna", "Peter", "Lucy", "Ryan", "Grace", "Sam", "Ella"];
  const lastNames = ["Miller", "Chen", "Garcia", "Kim", "Brown", "Nguyen", "Lopez", "Patel", "Smith", "Ortiz", "Reed", "Walsh", "Diaz", "Ford", "Hayes", "Cole", "Bishop", "Lane", "Pratt", "Moss", "Vega", "Sloan", "Barnes", "Quinn", "Frost"];
  for (let i = 0; i < 25; i++) {
    const email = `${firstNames[i].toLowerCase()}.${lastNames[i].toLowerCase()}@example.com`;
    await db.contact.upsert({
      where: { contactBookId_email: { contactBookId: book.id, email } },
      update: {},
      create: {
        firstName: firstNames[i],
        lastName: lastNames[i],
        email,
        subscribed: i % 8 !== 7,
        unsubscribeReason: i % 8 === 7 ? "UNSUBSCRIBED" : null,
        properties: {},
        contactBookId: book.id,
      },
    });
  }

  // ---- Templates ----
  const tmplHtml = (title, body) =>
    `<div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;padding:32px"><h1 style="font-size:22px">${title}</h1><p style="color:#555;line-height:1.6">${body}</p><a href="https://www.alisamadii.com" style="display:inline-block;background:#FC8464;color:#1f1410;padding:10px 22px;border-radius:999px;text-decoration:none;margin-top:12px">Visit site</a></div>`;
  for (const [name, subject, title, body] of [
    ["Welcome email", "Welcome to alisamadii 👋", "Welcome aboard!", "Thanks for joining. Here is everything you need to get started with your new website."],
    ["Monthly newsletter", "Your monthly update from alisamadii", "This month at a glance", "New features shipped, fresh blog posts, and tips to grow your traffic — all in one place."],
    ["Launch announcement", "We just launched something new 🚀", "Big news!", "Our newest offering is live. Be among the first to try it and tell us what you think."],
  ]) {
    const exists = await db.template.findFirst({ where: { teamId, name } });
    if (!exists) {
      await db.template.create({
        data: { name, teamId, subject, html: tmplHtml(title, body) },
      });
    }
  }

  // ---- Campaigns ----
  const campaigns = [
    {
      name: "September newsletter",
      subject: "Your monthly update from alisamadii",
      status: "SENT",
      total: 25, sent: 25, delivered: 24, opened: 14, clicked: 5, bounced: 1, hardBounced: 1, complained: 0, unsubscribed: 1,
      daysAgo: 6,
    },
    {
      name: "Product launch blast",
      subject: "We just launched something new 🚀",
      status: "SENT",
      total: 25, sent: 25, delivered: 25, opened: 17, clicked: 8, bounced: 0, hardBounced: 0, complained: 0, unsubscribed: 0,
      daysAgo: 16,
    },
    {
      name: "October newsletter (draft)",
      subject: "October update — sneak peek",
      status: "DRAFT",
      total: 0, sent: 0, delivered: 0, opened: 0, clicked: 0, bounced: 0, hardBounced: 0, complained: 0, unsubscribed: 0,
      daysAgo: 1,
    },
  ];
  for (const c of campaigns) {
    const exists = await db.campaign.findFirst({ where: { teamId, name: c.name } });
    if (exists) continue;
    const when = new Date();
    when.setDate(when.getDate() - c.daysAgo);
    await db.campaign.create({
      data: {
        name: c.name,
        teamId,
        from: "hello@send.alisamadii.com",
        domainId: domain.id,
        subject: c.subject,
        previewText: c.subject,
        html: tmplHtml(c.subject, "Campaign content preview."),
        contactBookId: book.id,
        status: c.status,
        total: c.total,
        sent: c.sent,
        delivered: c.delivered,
        opened: c.opened,
        clicked: c.clicked,
        bounced: c.bounced,
        hardBounced: c.hardBounced,
        complained: c.complained,
        unsubscribed: c.unsubscribed,
        lastSentAt: c.status === "SENT" ? when : null,
        createdAt: when,
      },
    });
  }

  // ---- Emails + events (Emails tab) ----
  const emailFixtures = [
    ["DELIVERED", "Welcome to alisamadii 👋"],
    ["OPENED", "Your monthly update from alisamadii"],
    ["CLICKED", "We just launched something new 🚀"],
    ["DELIVERED", "Your invoice for September"],
    ["OPENED", "Password reset request"],
    ["BOUNCED", "Your monthly update from alisamadii"],
    ["DELIVERED", "Verify your email address"],
    ["CLICKED", "Your monthly update from alisamadii"],
    ["COMPLAINED", "We just launched something new 🚀"],
    ["DELIVERED", "Welcome to alisamadii 👋"],
    ["OPENED", "Your order confirmation"],
    ["DELIVERED", "Your monthly update from alisamadii"],
    ["CLICKED", "Special offer inside"],
    ["DELIVERED", "Password reset request"],
    ["OPENED", "Welcome to alisamadii 👋"],
    ["DELIVERED", "Your invoice for September"],
    ["BOUNCED", "Special offer inside"],
    ["DELIVERED", "Verify your email address"],
    ["OPENED", "We just launched something new 🚀"],
    ["DELIVERED", "Your order confirmation"],
  ];
  const seededCount = await db.email.count({ where: { teamId, apiId: null, subject: { in: emailFixtures.map((f) => f[1]) } } });
  if (seededCount < emailFixtures.length) {
    for (let i = 0; i < emailFixtures.length; i++) {
      const [status, subject] = emailFixtures[i];
      const when = new Date();
      when.setHours(when.getHours() - i * 9);
      const recipient = `${firstNames[i % 25].toLowerCase()}.${lastNames[i % 25].toLowerCase()}@example.com`;
      const email = await db.email.create({
        data: {
          from: "hello@send.alisamadii.com",
          to: [recipient],
          replyTo: [],
          cc: [],
          bcc: [],
          subject,
          html: tmplHtml(subject, "This is mock email content for local preview."),
          text: "This is mock email content for local preview.",
          latestStatus: status,
          teamId,
          domainId: domain.id,
          createdAt: when,
        },
      });
      const chain = { DELIVERED: ["SENT", "DELIVERED"], OPENED: ["SENT", "DELIVERED", "OPENED"], CLICKED: ["SENT", "DELIVERED", "OPENED", "CLICKED"], BOUNCED: ["SENT", "BOUNCED"], COMPLAINED: ["SENT", "DELIVERED", "COMPLAINED"] }[status];
      for (let j = 0; j < chain.length; j++) {
        const evTime = new Date(when.getTime() + j * 60_000);
        await db.emailEvent.create({
          data: { emailId: email.id, status: chain[j], teamId, createdAt: evTime, data: {} },
        });
      }
    }
  }

  console.log("Done. domain:", domain.name, "| delivered:", totDelivered, "| hardBounced:", totHardBounced, "| complained:", totComplained);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
