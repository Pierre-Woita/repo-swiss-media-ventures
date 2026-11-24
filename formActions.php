<?php
/**
 * Swiss Media Ventures – Versand des Kontaktformulars (contact.html / kontakt.html)
 *
 * Nimmt per POST (multipart/form-data) die Formularfelder entgegen, validiert sie serverseitig und
 * schickt die Anfrage als Text-E-Mail an MAIL_TO. Antwort: JSON {"ok":true} bzw. {"ok":false,"error":"…"}.
 * Es werden keine Daten gespeichert (nur ein kurzer Zeitstempel pro IP-Hash für die Mengenbegrenzung).
 *
 * KONFIGURATION (vor dem Livegang anpassen):
 *   MAIL_TO    Empfängeradresse der Anfragen          → TODO: echte Adresse eintragen
 *   MAIL_FROM  Absenderadresse; muss zur Domain des Servers passen (SPF/DKIM), sonst landen Mails im Spam
 */

const MAIL_TO   = 'office@swissmediaventures.ch';   // Empfängeradresse der Anfragen
const MAIL_FROM = 'info@swissmediaventures.ch';   // Absender auf eigener Domain (SPF/DKIM beim Hoster prüfen)
const SUBJECT_PREFIX = '[Website] ';
const MIN_SECONDS_BETWEEN_SUBMITS = 30;              // Mengenbegrenzung pro IP

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

function respond(int $status, bool $ok, string $error = ''): void {
    http_response_code($status);
    echo json_encode($ok ? ['ok' => true] : ['ok' => false, 'error' => $error], JSON_UNESCAPED_UNICODE);
    exit;
}

/** Entfernt Zeilenumbrüche/Steuerzeichen (Schutz vor Header-Injection) und kürzt auf $max Zeichen. */
function clean_line(?string $v, int $max): string {
    $v = preg_replace('/[\x00-\x1F\x7F]+/u', ' ', (string)$v);
    return mb_substr(trim($v), 0, $max);
}
/** Mehrzeiliger Text: Zeilenumbrüche bleiben, übrige Steuerzeichen werden entfernt. */
function clean_text(?string $v, int $max): string {
    $v = preg_replace('/[^\P{C}\n]+/u', '', str_replace("\r\n", "\n", (string)$v));
    return mb_substr(trim($v), 0, $max);
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') respond(405, false, 'Method not allowed');

// Nur Anfragen von der eigenen Seite (falls der Browser einen Origin mitsendet)
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin !== '' && parse_url($origin, PHP_URL_HOST) !== ($_SERVER['HTTP_HOST'] ?? '') && !preg_match('/^localhost(:\d+)?$/', $_SERVER['HTTP_HOST'] ?? '')) {
    respond(403, false, 'Forbidden');
}

// Honeypot: gefüllt → Bot. Wir tun so, als wäre alles gut gegangen.
if (!empty($_POST['website_url'])) respond(200, true);

if (MAIL_TO === 'kontakt@example.com' /* Platzhalter-Schutz */) respond(503, false, 'Mail recipient is not configured');

// Mengenbegrenzung (pro IP, ohne Klartext-IP zu speichern)
$stamp = sys_get_temp_dir() . '/smv_contact_' . hash('sha256', ($_SERVER['REMOTE_ADDR'] ?? '') . 'smv');
if (is_file($stamp) && (time() - (int)@filemtime($stamp)) < MIN_SECONDS_BETWEEN_SUBMITS) {
    respond(429, false, 'Too many requests');
}

// ---- Felder lesen und prüfen ----
$topics   = ['general' => 'General enquiry', 'services' => 'Our services and operating model',
             'partnership' => 'Partnership or cooperation', 'media' => 'Press and media', 'other' => 'Other'];
$topicKey = $_POST['topic'] ?? '';
$first    = clean_line($_POST['firstname'] ?? '', 50);
$last     = clean_line($_POST['lastname'] ?? '', 50);
$company  = clean_line($_POST['company'] ?? '', 100);
$position = clean_line($_POST['position'] ?? '', 80);
$email    = clean_line($_POST['email'] ?? '', 254);
$phone    = clean_line($_POST['phone'] ?? '', 25);
$website  = clean_line($_POST['website'] ?? '', 200);
$channel  = ($_POST['channel'] ?? '') === 'phone' ? 'phone' : 'email';
$lang     = ($_POST['language'] ?? '') === 'en' ? 'English' : 'Deutsch';
$message  = clean_text($_POST['message'] ?? '', 2000);
$consent  = !empty($_POST['consent']);

$errors = [];
if (!isset($topics[$topicKey]))                                           $errors[] = 'topic';
if (mb_strlen($first) < 2 || mb_strlen($last) < 2)                        $errors[] = 'name';
if (mb_strlen($company) < 2)                                              $errors[] = 'company';
if (!filter_var($email, FILTER_VALIDATE_EMAIL))                           $errors[] = 'email';
if ($channel === 'phone' && !preg_match('/^\+?[\d\s()\/.\-]{6,25}$/', $phone)) $errors[] = 'phone';
if ($phone !== '' && !preg_match('/^\+?[\d\s()\/.\-]{6,25}$/', $phone))   $errors[] = 'phone';
if (mb_strlen($message) < 10)                                             $errors[] = 'message';
if (!$consent)                                                            $errors[] = 'consent';
if ($errors) respond(422, false, 'Invalid input: ' . implode(', ', array_unique($errors)));

// ---- E-Mail zusammenstellen ----
$subject = SUBJECT_PREFIX . $topics[$topicKey] . ' – ' . $first . ' ' . $last . ($company !== '' ? ' (' . $company . ')' : '');
$body = "New enquiry via the website contact form\n"
      . str_repeat('-', 48) . "\n"
      . "Subject:          {$topics[$topicKey]}\n"
      . "Name:             $first $last\n"
      . "Company:          $company\n"
      . "Position:         " . ($position !== '' ? $position : '-') . "\n"
      . "E-mail:           $email\n"
      . "Phone:            " . ($phone !== '' ? $phone : '-') . "\n"
      . "Website/platform: " . ($website !== '' ? $website : '-') . "\n"
      . "Reply via:        " . ($channel === 'phone' ? 'phone' : 'e-mail') . "\n"
      . "Reply language:   $lang\n"
      . "Consent given:    yes (privacy policy)\n"
      . str_repeat('-', 48) . "\nMessage:\n\n$message\n\n"
      . str_repeat('-', 48) . "\nSent: " . gmdate('Y-m-d H:i') . " UTC\n";

$headers = [
    'From'         => 'Swiss Media Ventures Website <' . MAIL_FROM . '>',
    'Reply-To'     => $first . ' ' . $last . ' <' . $email . '>',   // $email und Namen enthalten keine Zeilenumbrüche
    'MIME-Version' => '1.0',
    'Content-Type' => 'text/plain; charset=UTF-8',
    'X-Mailer'     => 'SMV contact form',
];

$encodedSubject = '=?UTF-8?B?' . base64_encode($subject) . '?=';
$sent = mail(MAIL_TO, $encodedSubject, $body, $headers);
if (!$sent) respond(500, false, 'Mail could not be sent');

@touch($stamp);
respond(200, true);
