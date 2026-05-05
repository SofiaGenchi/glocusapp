const db = require('../config/db');

const VALID_UNITS = ['mg/dL', 'mmol/L'];
const VALID_CONTEXTS = ['', 'Ayunas', 'Después de comer', 'Antes de comer', 'Antes de dormir', 'Ejercicio', 'Otro'];

const normalizeText = (value) => (typeof value === 'string' ? value.trim() : '');

const isValidDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00`));
const isValidTime = (value) => /^\d{2}:\d{2}$/.test(value);

const validateMeasurement = (payload) => {
    const glucoseValue = Number(payload.glucose_value);
    const date = normalizeText(payload.date);
    const time = normalizeText(payload.time);
    const unit = normalizeText(payload.unit) || 'mg/dL';
    const context = normalizeText(payload.context);
    const notes = normalizeText(payload.notes);

    if (!Number.isFinite(glucoseValue)) {
        return { error: "Ingresá un valor de glucosa válido." };
    }

    const min = unit === 'mmol/L' ? 1 : 20;
    const max = unit === 'mmol/L' ? 35 : 600;
    if (glucoseValue < min || glucoseValue > max) {
        return { error: `El valor debe estar entre ${min} y ${max} ${unit}.` };
    }

    if (!VALID_UNITS.includes(unit)) {
        return { error: "La unidad debe ser mg/dL o mmol/L." };
    }

    if (!isValidDate(date)) {
        return { error: "Ingresá una fecha válida." };
    }

    if (!isValidTime(time)) {
        return { error: "Ingresá una hora válida." };
    }

    if (!VALID_CONTEXTS.includes(context)) {
        return { error: "El contexto seleccionado no es válido." };
    }

    if (notes.length > 500) {
        return { error: "Las notas no pueden superar los 500 caracteres." };
    }

    return {
        data: {
            glucose_value: glucoseValue,
            date,
            time,
            unit,
            context: context || null,
            notes: notes || null
        }
    };
};

const findMeasurementForUser = (measurementId, userId, callback) => {
    db.get(
        `SELECT * FROM measurements WHERE id = ? AND user_id = ?`,
        [measurementId, userId],
        callback
    );
};

const buildHistoryQuery = (userId, query, sortDirection = 'DESC') => {
    const { from, to } = query;
    const params = [userId];
    let sql = `SELECT * FROM measurements WHERE user_id = ?`;

    if (from) {
        if (!isValidDate(from)) return { error: "La fecha inicial no es válida." };
        sql += ` AND date >= ?`;
        params.push(from);
    }

    if (to) {
        if (!isValidDate(to)) return { error: "La fecha final no es válida." };
        sql += ` AND date <= ?`;
        params.push(to);
    }

    const direction = sortDirection === 'ASC' ? 'ASC' : 'DESC';
    sql += ` ORDER BY date ${direction}, time ${direction}, id ${direction}`;

    return { sql, params };
};

const calculateStatsByUnit = (rows) => {
    const grouped = rows.reduce((acc, row) => {
        const unit = row.unit || 'mg/dL';
        if (!acc[unit]) acc[unit] = [];
        acc[unit].push(Number(row.glucose_value));
        return acc;
    }, {});

    return Object.entries(grouped).map(([unit, values]) => {
        const sum = values.reduce((total, value) => total + value, 0);
        return {
            unit,
            count: values.length,
            average: Math.round((sum / values.length) * 10) / 10,
            min: Math.min(...values),
            max: Math.max(...values)
        };
    });
};

const removeAccents = (text) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const escapePdfText = (value) => removeAccents(String(value ?? '')).replace(/[\\()]/g, '\\$&');
const isValidImageDataUrl = (value) => (
    typeof value === 'string' &&
    /^data:image\/(png|jpeg|jpg|webp);base64,[A-Za-z0-9+/=]+$/.test(value)
);

const parseJsonFromText = (text) => {
    if (!text) return null;

    try {
        return JSON.parse(text);
    } catch {
        const match = text.match(/\{[\s\S]*\}/);
        if (!match) return null;

        try {
            return JSON.parse(match[0]);
        } catch {
            return null;
        }
    }
};

const extractResponseText = (responseBody) => {
    if (typeof responseBody.output_text === 'string') return responseBody.output_text;

    return responseBody.output
        ?.flatMap((item) => item.content || [])
        ?.map((content) => content.text)
        ?.filter(Boolean)
        ?.join('\n') || '';
};

const validateExtractedReading = (reading) => {
    const value = Number(reading?.glucose_value);
    const unit = VALID_UNITS.includes(reading?.unit) ? reading.unit : 'mg/dL';
    const min = unit === 'mmol/L' ? 1 : 20;
    const max = unit === 'mmol/L' ? 35 : 600;

    if (!Number.isFinite(value) || value < min || value > max) {
        return {
            glucose_value: null,
            unit,
            confidence: 0,
            notes: 'No se detectó una lectura plausible en la imagen.'
        };
    }

    const confidence = Number(reading.confidence);

    return {
        glucose_value: value,
        unit,
        confidence: Number.isFinite(confidence) ? Math.max(0, Math.min(1, confidence)) : 0.5,
        notes: normalizeText(reading.notes)
    };
};

const createPdf = ({ title, subtitle, patientName, generatedAt, rows, stats }) => {
    const pageWidth = 595.28;
    const pageHeight = 841.89;
    const margin = 42;
    const lineHeight = 16;
    const objects = [];
    const pages = [];
    let currentLines = [];
    let y = pageHeight - margin;

    const addObject = (content) => {
        objects.push(content);
        return objects.length;
    };

    const addText = (text, x, nextY, size = 10, font = 'F1') => {
        currentLines.push(`BT /${font} ${size} Tf ${x} ${nextY} Td (${escapePdfText(text)}) Tj ET`);
    };

    const newPage = () => {
        if (currentLines.length) pages.push(currentLines.join('\n'));
        currentLines = [];
        y = pageHeight - margin;
    };

    const ensureSpace = (height = lineHeight) => {
        if (y - height < margin) newPage();
    };

    addText(title, margin, y, 18, 'F2');
    y -= 24;
    addText(subtitle, margin, y, 10);
    y -= 16;
    addText(`Paciente: ${patientName || '-'}`, margin, y, 10);
    y -= 16;
    addText(`Fecha de generacion: ${generatedAt}`, margin, y, 10);
    y -= 28;

    addText('Resumen estadistico', margin, y, 13, 'F2');
    y -= 20;

    if (stats.length === 0) {
        addText('No hay mediciones para el periodo seleccionado.', margin, y);
        y -= lineHeight;
    } else {
        stats.forEach((item) => {
            addText(`${item.unit}: ${item.count} mediciones | Promedio ${item.average} | Min ${item.min} | Max ${item.max}`, margin, y);
            y -= lineHeight;
        });
    }

    y -= 12;
    addText('Detalle de mediciones', margin, y, 13, 'F2');
    y -= 20;
    addText('Fecha       Hora   Valor       Contexto             Observaciones', margin, y, 10, 'F2');
    y -= 14;

    rows.forEach((row) => {
        ensureSpace(34);
        const context = row.context || '-';
        const notes = row.notes || '-';
        const value = `${row.glucose_value} ${row.unit || 'mg/dL'}`;
        addText(`${row.date}  ${row.time}  ${value.padEnd(10)}  ${context.padEnd(18)}  ${notes}`.slice(0, 105), margin, y);
        y -= lineHeight;
    });

    y -= 16;
    ensureSpace(40);
    addText('Nota: Este informe ayuda a revisar registros, pero no reemplaza el consejo medico profesional.', margin, y, 9);
    newPage();

    const fontRegularId = addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
    const fontBoldId = addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');

    const pageObjectIds = [];
    const contentObjectIds = [];
    pages.forEach((content) => {
        const stream = `${content}\n`;
        contentObjectIds.push(addObject(`<< /Length ${Buffer.byteLength(stream, 'latin1')} >>\nstream\n${stream}endstream`));
        pageObjectIds.push(null);
    });

    const pagesObjectId = objects.length + pages.length + 1;

    contentObjectIds.forEach((contentId, index) => {
        pageObjectIds[index] = addObject(`<< /Type /Page /Parent ${pagesObjectId} 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 ${fontRegularId} 0 R /F2 ${fontBoldId} 0 R >> >> /Contents ${contentId} 0 R >>`);
    });

    const kids = pageObjectIds.map((id) => `${id} 0 R`).join(' ');
    addObject(`<< /Type /Pages /Kids [${kids}] /Count ${pageObjectIds.length} >>`);
    const catalogId = addObject(`<< /Type /Catalog /Pages ${pagesObjectId} 0 R >>`);

    let pdf = '%PDF-1.4\n';
    const offsets = [0];
    objects.forEach((object, index) => {
        offsets.push(Buffer.byteLength(pdf, 'latin1'));
        pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
    });

    const xrefOffset = Buffer.byteLength(pdf, 'latin1');
    pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    offsets.slice(1).forEach((offset) => {
        pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
    });
    pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

    return Buffer.from(pdf, 'latin1');
};

exports.addMeasurement = (req, res) => {
    const validation = validateMeasurement(req.body);
    if (validation.error) return res.status(400).json({ error: validation.error });

    const userId = req.user.id;
    const { glucose_value, date, time, unit, context, notes } = validation.data;

    const sql = `
        INSERT INTO measurements (user_id, glucose_value, date, time, unit, context, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    db.run(sql, [userId, glucose_value, date, time, unit, context, notes], function(err) {
        if (err) {
            return res.status(500).json({ error: "Error al guardar la medición" });
        }

        findMeasurementForUser(this.lastID, userId, (findErr, row) => {
            if (findErr) return res.status(500).json({ error: "La medición se guardó, pero no pudo recuperarse." });
            res.status(201).json({ message: "Medición guardada", measurement: row });
        });
    });
};

exports.getHistory = (req, res) => {
    const userId = req.user.id;
    const query = buildHistoryQuery(userId, req.query);
    if (query.error) return res.status(400).json({ error: query.error });

    db.all(query.sql, query.params, (err, rows) => {
        if (err) {
            return res.status(500).json({ error: "Error al obtener el historial" });
        }
        res.json(rows);
    });
};

exports.downloadReport = (req, res) => {
    const userId = req.user.id;
    const query = buildHistoryQuery(userId, req.query, 'ASC');
    if (query.error) return res.status(400).json({ error: query.error });

    db.all(query.sql, query.params, (err, rows) => {
        if (err) return res.status(500).json({ error: "Error al generar el informe" });

        db.get(`SELECT username, first_name, last_name FROM users WHERE id = ?`, [userId], (userErr, user) => {
            if (userErr) return res.status(500).json({ error: "Error al obtener datos del usuario" });

            const period = `${req.query.from || 'inicio'} a ${req.query.to || 'hoy'}`;
            const fullName = [user?.first_name, user?.last_name].filter(Boolean).join(' ') || user?.username || 'Usuario';
            const generatedAt = new Date().toLocaleDateString('es-AR');
            const pdf = createPdf({
                title: 'Informe de mediciones de glucosa',
                subtitle: `Periodo: ${period} | Total: ${rows.length} mediciones`,
                patientName: fullName,
                generatedAt,
                rows,
                stats: calculateStatsByUnit(rows)
            });

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', 'attachment; filename="informe-glucosa.pdf"');
            res.send(pdf);
        });
    });
};

exports.analyzePhoto = async (req, res) => {
    const { imageData } = req.body;

    if (!isValidImageDataUrl(imageData)) {
        return res.status(400).json({ error: "Subí una imagen PNG, JPG o WEBP válida." });
    }

    const estimatedBytes = Math.ceil((imageData.split(',')[1]?.length || 0) * 0.75);
    if (estimatedBytes > 8 * 1024 * 1024) {
        return res.status(400).json({ error: "La imagen es demasiado grande. Probá con una foto menor a 8 MB." });
    }

    if (!process.env.OPENAI_API_KEY) {
        return res.json({
            glucose_value: null,
            unit: 'mg/dL',
            confidence: 0,
            needsReview: true,
            message: "La foto se cargó correctamente, pero no hay un motor de visión configurado. Revisá la imagen e ingresá el valor manualmente."
        });
    }

    try {
        const response = await fetch('https://api.openai.com/v1/responses', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: process.env.OPENAI_VISION_MODEL || 'gpt-4.1-mini',
                input: [
                    {
                        role: 'user',
                        content: [
                            {
                                type: 'input_text',
                                text: [
                                    'Analizá la foto de un glucómetro y extraé solo la lectura principal de glucosa.',
                                    'Respondé exclusivamente JSON con estas claves:',
                                    '{"glucose_value": number|null, "unit": "mg/dL"|"mmol/L", "confidence": number, "notes": string}.',
                                    'Si la imagen es borrosa, hay reflejos o no se ve un valor claro, usá glucose_value null y confidence 0.'
                                ].join(' ')
                            },
                            {
                                type: 'input_image',
                                image_url: imageData,
                                detail: 'high'
                            }
                        ]
                    }
                ]
            })
        });

        if (!response.ok) {
            return res.status(502).json({ error: "No se pudo analizar la imagen en este momento." });
        }

        const responseBody = await response.json();
        const parsed = parseJsonFromText(extractResponseText(responseBody));
        const reading = validateExtractedReading(parsed);

        res.json({
            ...reading,
            needsReview: true,
            message: reading.glucose_value
                ? "Lectura detectada. Revisá y confirmá antes de guardar."
                : "No se pudo detectar una lectura confiable. Ingresá o corregí el valor manualmente."
        });
    } catch (err) {
        res.status(502).json({ error: "No se pudo analizar la imagen. Probá con una foto más clara." });
    }
};

exports.updateMeasurement = (req, res) => {
    const validation = validateMeasurement(req.body);
    if (validation.error) return res.status(400).json({ error: validation.error });

    const userId = req.user.id;
    const measurementId = req.params.id;
    const { glucose_value, date, time, unit, context, notes } = validation.data;

    const sql = `
        UPDATE measurements
        SET glucose_value = ?, date = ?, time = ?, unit = ?, context = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND user_id = ?
    `;

    db.run(sql, [glucose_value, date, time, unit, context, notes, measurementId, userId], function(err) {
        if (err) return res.status(500).json({ error: "Error al actualizar la medición" });
        if (this.changes === 0) return res.status(404).json({ error: "Medición no encontrada" });

        findMeasurementForUser(measurementId, userId, (findErr, row) => {
            if (findErr) return res.status(500).json({ error: "La medición se actualizó, pero no pudo recuperarse." });
            res.json({ message: "Medición actualizada", measurement: row });
        });
    });
};

exports.deleteMeasurement = (req, res) => {
    const userId = req.user.id;
    const measurementId = req.params.id;

    db.run(`DELETE FROM measurements WHERE id = ? AND user_id = ?`, [measurementId, userId], function(err) {
        if (err) return res.status(500).json({ error: "Error al eliminar la medición" });
        if (this.changes === 0) return res.status(404).json({ error: "Medición no encontrada" });

        res.json({ message: "Medición eliminada" });
    });
};
