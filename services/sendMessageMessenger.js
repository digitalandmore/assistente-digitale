async function sendMessengerMessage(to, text) {
  const token = process.env.PAGE_ACCESS_TOKEN;
  const res = await fetch(`https://graph.facebook.com/v17.0/me/messages?access_token=${token}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      recipient: { id: to },
      message: { text }
    })
  });
  return res.json();
}

export default sendMessengerMessage;