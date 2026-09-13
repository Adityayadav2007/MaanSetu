/**
 * Statutory reference number generation.
 *
 * Every number issued by this system is sequential within its scope and must be
 * unique, because the number is the legal identifier printed on the certificate
 * and quoted in correspondence. All generators here take a transaction client so
 * the "read the highest existing number, add one" step runs under the same lock
 * as the insert — two concurrent issues would otherwise both read the same
 * maximum and collide.
 */

/** Abbreviate a place name to a short code for numbering. `Kanpur Nagar` → `KNR`. */
export function placeCode(name, length = 3) {
  const words = String(name || '')
    .replace(/[^A-Za-z\s]/g, '')
    .split(/\s+/)
    .filter(Boolean)

  let code
  if (words.length === 0) {
    code = 'X'.repeat(length)
  } else if (words.length === 1) {
    code = words[0].slice(0, length).toUpperCase()
  } else {
    code = words.map((w) => w[0]).join('').toUpperCase()
  }

  return code.padEnd(length, 'X').slice(0, length)
}

/**
 * Next application number.
 * Format: APP/<STATE_CODE>/<YEAR>/<7-digit sequence>
 *
 * @param {import('pg').PoolClient} client - transaction client
 * @param {string} stateCode
 */
export async function nextApplicationNo(client, stateCode) {
  const year = new Date().getFullYear()
  const prefix = `APP/${stateCode}/${year}/`
  const { rows } = await client.query(
    `SELECT application_no FROM applications
      WHERE application_no LIKE $1
      ORDER BY application_no DESC
      LIMIT 1`,
    [`${prefix}%`],
  )
  const last = rows[0]?.application_no
  const seq = last ? Number(last.slice(prefix.length)) + 1 : 1
  return prefix + String(seq).padStart(7, '0')
}

/**
 * Next certificate number.
 * Format: LM/<STATE_CODE>/<DISTRICT_CODE>/<YEAR>/<6-digit sequence>
 *
 * @param {import('pg').PoolClient} client - transaction client
 */
export async function nextCertificateNo(client, stateCode, districtCode) {
  const year = new Date().getFullYear()
  const prefix = `LM/${stateCode}/${districtCode}/${year}/`
  const { rows } = await client.query(
    `SELECT certificate_no FROM certificates
      WHERE certificate_no LIKE $1
      ORDER BY certificate_no DESC
      LIMIT 1`,
    [`${prefix}%`],
  )
  const last = rows[0]?.certificate_no
  const seq = last ? Number(last.slice(prefix.length)) + 1 : 1
  return prefix + String(seq).padStart(6, '0')
}

/**
 * Next instrument reference for a business.
 * Format: INS-<STATE_CODE>-<YEAR>-<6-digit sequence>
 *
 * Scoped per business rather than globally: the number identifies the
 * instrument within the holder's register, and a per-business sequence avoids
 * handing out sparse, guessable national numbers.
 *
 * @param {import('pg').PoolClient} client - transaction client
 */
export async function nextInstrumentNo(client, businessId, stateCode) {
  const year = new Date().getFullYear()
  const prefix = `INS-${stateCode}-${year}-`
  const { rows } = await client.query(
    `SELECT instrument_id FROM instruments
      WHERE business_id = $1 AND instrument_id LIKE $2
      ORDER BY instrument_id DESC
      LIMIT 1`,
    [businessId, `${prefix}%`],
  )
  const last = rows[0]?.instrument_id
  const seq = last ? Number(last.slice(prefix.length)) + 1 : 1
  return prefix + String(seq).padStart(6, '0')
}

/**
 * Next business registration number.
 * Format: BUS-<YEAR>-<6-digit sequence>
 *
 * @param {import('pg').PoolClient} client - transaction client
 */
export async function nextRegistrationNo(client) {
  const year = new Date().getFullYear()
  const prefix = `BUS-${year}-`
  const { rows } = await client.query(
    `SELECT registration_no FROM businesses
      WHERE registration_no LIKE $1
      ORDER BY registration_no DESC
      LIMIT 1`,
    [`${prefix}%`],
  )
  const last = rows[0]?.registration_no
  const seq = last ? Number(last.slice(prefix.length)) + 1 : 1
  return prefix + String(seq).padStart(6, '0')
}
