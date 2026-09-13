export interface CannedTemplate {
  id: string;
  title: string;
  subject?: string;
  bodyHtml: string;
  isCustom?: boolean;
  createdAt?: string | Date;
}

export const PREDEFINED_TEMPLATES: CannedTemplate[] = [
  {
    id: 'pre-ack',
    title: 'Confirmación y acuse de recibo',
    subject: 'Acuse de recibo',
    bodyHtml: `<p>Estimado/a,</p><p>Confirmamos la correcta recepción de su mensaje. Nuestro equipo está revisando los detalles y le responderá a la mayor brevedad posible.</p><p>Atentamente,<br><strong>El equipo</strong></p>`,
  },
  {
    id: 'pre-meeting',
    title: 'Solicitud de reunión',
    subject: 'Propuesta de reunión',
    bodyHtml: `<p>Hola,</p><p>Me gustaría coordinar una breve reunión de 15 a 20 minutos para tratar los próximos pasos de manera ágil.</p><p>¿Tendrías disponibilidad en alguno de estos horarios?:</p><ul><li>Opción 1: [Día] a las [Hora]</li><li>Opción 2: [Día] a las [Hora]</li></ul><p>Quedo a la espera de tu confirmación.</p><p>Un cordial saludo,</p>`,
  },
  {
    id: 'pre-followup',
    title: 'Seguimiento comercial',
    subject: 'Seguimiento de nuestra propuesta',
    bodyHtml: `<p>Estimado/a,</p><p>Le escribo para hacer un breve seguimiento sobre el tema tratado anteriormente y consultar si tuvo oportunidad de revisar la información compartida.</p><p>Quedo a su entera disposición para resolver cualquier duda o consulta adicional.</p><p>Un cordial saludo,</p>`,
  },
  {
    id: 'pre-quote',
    title: 'Envío de presupuesto',
    subject: 'Presupuesto y propuesta de servicios',
    bodyHtml: `<p>Estimado/a cliente,</p><p>Adjunto a este correo encontrará la propuesta detallada y el presupuesto acordado para su respectiva revisión.</p><p>Si requiere alguna aclaración o modificación en los términos, no dude en hacérnoslo saber.</p><p>Agradecemos su confianza.<br>Atentamente,</p>`,
  },
  {
    id: 'pre-support',
    title: 'Soporte / En revisión técnica',
    subject: 'Incidencia recibida y en análisis',
    bodyHtml: `<p>Hola,</p><p>Hemos registrado su solicitud de soporte con éxito. El equipo técnico se encuentra analizando el caso y le notificaremos en cuanto dispongamos de una actualización o resolución definitiva.</p><p>Gracias por su paciencia y colaboración.<br><strong>Soporte Técnico</strong></p>`,
  },
];
