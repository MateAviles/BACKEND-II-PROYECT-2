

import nodemailer from "nodemailer";

let transporter = null;

export const sentMails = [];

const buildTransporter = async () => {
    if(transporter){
        return transporter;
    }

    if(process.env.NODE_ENV === 'test'){
        transporter = nodemailer.createTransport({
            streamTransport: true,
            newline: 'universal'
        });
        return transporter;
    }

    if(process.env.MAIL_HOST){
        transporter = nodemailer.createTransport({
            host: process.env.MAIL_HOST,
            port: Number(process.env.MAIL_PORT) || 587,
            secure: Number(process.env.MAIL_PORT) === 465,
            auth: process.env.MAIL_USER
                ? { user: process.env.MAIL_USER, pass: process.env.MAIL_PASS }
                : undefined
        });
        return transporter;
    }

    const account = await nodemailer.createTestAccount();

    transporter = nodemailer.createTransport({
        host: account.smtp.host,
        port: account.smtp.port,
        secure: account.smtp.secure,
        auth: { user: account.user, pass: account.pass }
    });

    return transporter;
};

export const sendTicketConfirmation = async ({ ticket, event, userEmail }) => {
    const transport = await buildTransporter();

    const mail = {
        from: process.env.MAIL_FROM || '"Plataforma de Eventos" <no-reply@events.local>',
        to: userEmail,
        subject: `Inscripción confirmada — ${event.title}`,
        text: [
            `Tu inscripción fue confirmada.`,
            ``,
            `Evento: ${event.title}`,
            `Fecha: ${event.date.toISOString()}`,
            `Lugar: ${event.location}`,
            `Lugares: ${ticket.quantity}`,
            `Código de reserva: ${ticket.reservationCode}`,
            ``,
            `Si necesitás cancelar, ingresá con tu usuario en la plataforma.`
        ].join('\n'),
        html: `
            <h2>Inscripción confirmada</h2>
            <p><strong>Evento:</strong> ${event.title}</p>
            <p><strong>Fecha:</strong> ${event.date.toISOString()}</p>
            <p><strong>Lugar:</strong> ${event.location}</p>
            <p><strong>Lugares:</strong> ${ticket.quantity}</p>
            <p><strong>Código de reserva:</strong> ${ticket.reservationCode}</p>
        `
    };

    const info = await transport.sendMail(mail);

    if(process.env.NODE_ENV === 'test'){
        sentMails.push({
            to: mail.to,
            subject: mail.subject,
            text: mail.text,
            messageId: info.messageId
        });
    }

    return {
        messageId: info.messageId,
        previewUrl: nodemailer.getTestMessageUrl(info)
    };
};
