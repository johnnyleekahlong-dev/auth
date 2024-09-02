const headerStyle = `
  background: linear-gradient(to right, #4CAF50, #45a049);
  text-align: center;
  padding: 20px;
  color: white;
  margin: 0;
`;

const contentStyle = `
  background-color: #f9f9f9;
  padding: 20px;
  border-radius: 0 0 5px 5px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
`;

const title = (text: string) => `<h1 style="${headerStyle}">${text}</h1>`;

const contentWrapper = (body: string) => `
<div style="${contentStyle}">
  ${body}
</div>
`;

export const welcome = (username: string) => `
${title('Welcome')}
${contentWrapper(`
  <p>Hello ${username}</p>
  <p>Thank you for signing up! You are now registered to the application.</p>
  <p>If you didn't create an account with us, please ignore this email.</p>
`)}`;

export const verify = (username: string, verificationCode: string) => `
${title('Verify Your Email')}
${contentWrapper(`
  <p>Hello ${username}</p>
  <p>Thank you for signing up! Your verification code is:</p>
  <div style="text-align: center; margin: 30px 0;">
    <span
      style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #4CAF50;"
    >${verificationCode}</span>
  </div>
  <p>Enter this code on the verification page to complete your registration.</p>
  <p>This code will expire in 24 hours for security reasons.</p>
  <p>If you didn't create an account with us, please ignore this email.</p>
`)}`;

export const resetPassword = (username: string, resetURL: string) => `
${title('Password Reset')}
${contentWrapper(`
    <p>Hello, ${username}</p>
    <p>We received a request to reset your password. If you didn't make this
        request, please ignore this email.</p>
    <p>To reset your password, click the button below:</p>
    <div style="text-align: center; margin: 30px 0;">
        <a
        href="${resetURL}"
        style="background-color: #4CAF50; color: white; padding: 12px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;"
        >Reset Password</a>

    </div>
    <p>This link will expire in 1 hour for security reasons.</p>
`)}`;
