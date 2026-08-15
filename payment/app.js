/*
 * TonyJocks PromptPay / Thai QR Generator
 *
 * Ported from the existing PHP PromptPay class.
 *
 * This version generates the PAYMENT PAYLOAD only.
 * QR rendering will be added after we verify the payload.
 */

/* 
* Google Apps Script Web App 
*/
const PAYMENT_API_URL =
    "https://script.google.com/macros/s/AKfycbwh7qxWQQZWEfkTC_tdIcwOPrz3M4k5V9mj8kubX62ATgqiZoEgLTvUde23C9_gB9jS/exec";

/* =========================================================
   STATIC MERCHANT CONFIGURATION
   ========================================================= */

const PROMPTPAY_ID = '4787720001114259';

const MERCHANT_NAME = 'TONYJOCKS APPAREL';
const MERCHANT_CATEGORY_CODE = '5699';
const CURRENCY = '764';
const COUNTRY_CODE = 'TH';
const CITY = 'TONYJOCKS.COM';

const TRANSACTION_PREFIX = 'KPS';
const TRANSACTION_CODE_LENGTH = 20;

const KPLUSSHOP_QR_RUNNING = '484612056';

const MERCHANT_CODE = 'KB000001657533';
const BILLER_ID = '010753600031508';

const TERMINAL_ID = '42005924';

const FIELD_00 = '01';
const FIELD_01 = '11';
const FIELD_02 = PROMPTPAY_ID;
const FIELD_04 = '530392000111456';
const FIELD_15 = '3430076400520446401220059241001';

const FIELD_30_SUBFIELD_00 = 'A000000677010112';
const FIELD_31_SUBFIELD_00 = 'A000000677010113';

const FIELD_31_SUBFIELD_01 = '004';

const FIELD_51 = '0014A00000000410100106416971021112345678901';


/* =========================================================
   HELPER
   ========================================================= */

function tlv(fieldId, value) {
    const length = String(value.length).padStart(2, '0');
    return fieldId + length + value;
}


/* =========================================================
   TRANSACTION CODE
   PHP equivalent:
 *
 * $this->transactionCode =
 *     TRANSACTION_PREFIX .
 *     str_pad($orderCode, ..., '0', STR_PAD_LEFT);
 * ========================================================= */

function createTransactionCode(reference) {

    reference = String(reference).trim();

    const remainingLength =
        TRANSACTION_CODE_LENGTH -
        TRANSACTION_PREFIX.length -
        reference.length;

    if (remainingLength < 0) {
        throw new Error(
            'Reference is too long. Maximum allowed length is ' +
            (TRANSACTION_CODE_LENGTH - TRANSACTION_PREFIX.length) +
            ' characters.'
        );
    }

    return (
        TRANSACTION_PREFIX +
        reference.padStart(
            reference.length + remainingLength,
            '0'
        )
    );
}


/* =========================================================
   FIELD 30
   ========================================================= */

function createField30(transactionCode) {

    let value = '';

    value += tlv('00', FIELD_30_SUBFIELD_00);
    value += tlv('01', BILLER_ID);
    value += tlv('02', MERCHANT_CODE);
    value += tlv('03', transactionCode);

    return value;
}


/* =========================================================
   FIELD 31
   ========================================================= */

function createField31(transactionCode) {

    let value = '';

    value += tlv('00', FIELD_31_SUBFIELD_00);
    value += tlv('01', FIELD_31_SUBFIELD_01);
    value += tlv('02', MERCHANT_CODE);
    value += tlv('03', transactionCode);

    return value;
}


/* =========================================================
   FIELD 62
   ========================================================= */

function createField62() {

    return (
        tlv('05', KPLUSSHOP_QR_RUNNING) +
        tlv('07', TERMINAL_ID)
    );
}


/* =========================================================
   CRC16-CCITT
   Same algorithm as your PHP class.
   ========================================================= */

function calculateCRC16(data) {

    const polynomial = 0x1021;
    let value = 0xFFFF;

    for (let i = 0; i < data.length; i++) {

        value ^= data.charCodeAt(i) << 8;

        for (let bit = 0; bit < 8; bit++) {

            if ((value & 0x8000) !== 0) {
                value = (value << 1) ^ polynomial;
            } else {
                value <<= 1;
            }

            value &= 0xFFFF;
        }
    }

    return value
        .toString(16)
        .toUpperCase()
        .padStart(4, '0');
}


/* =========================================================
   GENERATE PROMPTPAY PAYLOAD
   ========================================================= */

function generatePromptPayPayload(amount, reference) {

    const transactionCode =
        createTransactionCode(reference);

    const field30 =
        createField30(transactionCode);

    const field31 =
        createField31(transactionCode);

    const field62 =
        createField62();

    let fields = {

        '00': FIELD_00,
        '01': FIELD_01,
        '02': FIELD_02,
        '04': FIELD_04,
        '15': FIELD_15,
        '30': field30,
        '31': field31,
        '51': FIELD_51,
        '52': MERCHANT_CATEGORY_CODE,
        '53': CURRENCY,
        '58': COUNTRY_CODE,
        '59': MERCHANT_NAME,
        '60': CITY,
        '62': field62

    };


    /* =====================================================
       Field 54 - Transaction Amount
       ===================================================== */

    amount = Number(amount);

    if (!Number.isFinite(amount) || amount <= 0) {
        throw new Error('Amount must be greater than zero.');
    }

    fields['54'] = amount.toFixed(2);


    /* =====================================================
       Sort fields numerically
       Equivalent to PHP ksort()
       ===================================================== */

    const sortedFieldIds =
        Object.keys(fields).sort(
            (a, b) => Number(a) - Number(b)
        );


    let payload = '';

    for (const fieldId of sortedFieldIds) {

        payload += tlv(
            fieldId,
            fields[fieldId]
        );

    }


    /* =====================================================
       Field 63 / CRC
       ===================================================== */

    const payloadForCRC =
        payload + '6304';

    const checksum =
        calculateCRC16(payloadForCRC);

    return payloadForCRC + checksum;
}
