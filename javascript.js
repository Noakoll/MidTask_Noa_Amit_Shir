// ===== משתנה גלובלי למעקב אחרי חיבור SCORM =====
let isScormConnected = false;

// ===== אתחול ראשוני לאחר טעינת העמוד =====
document.addEventListener("DOMContentLoaded", function () {

    // ===== SCORM init (from slide) =====
    // בדיקת קיום ספריית SCORM
    if (!window.pipwerks || !pipwerks.SCORM) {
        console.warn('[SCORM] Wrapper not found.');
        return;
    }

    // ניסיון התחברות ל-LMS
    isScormConnected = pipwerks.SCORM.init();
    if (!isScormConnected) {
        console.error('[SCORM] init() failed.');
        return;
    }

    // שליפת נתוני הלומד מה-LMS
    fetchLearnerData();
    /// ===== end SCORM init =====

    // ===== אתחול מנגנון החיפוש =====
    // שדה החיפוש
    let searchInput = document.getElementById("searchInput");

    // כפתור החיפוש
    let searchBtn = document.getElementById("searchBtn");

    // חיפוש בזמן אמת – בכל הקלדה
    searchInput.addEventListener("keyup", filterCards);

    // חיפוש גם בלחיצה על הכפתור
    searchBtn.addEventListener("click", filterCards);
});


// ===== פונקציית סינון כרטיסיות =====
// פונקציה שמבצעת סינון של יחידות התוכן
function filterCards() {

    // לוקחים את הערך משדה החיפוש ומסירים רווחים מיותרים
    let term = document.getElementById("searchInput").value.trim();

    // מביאים את כל הכרטיסיות
    let cards = document.getElementsByClassName("card");

    // מונה לספירת כרטיסיות שמוצגות
    let visibleCount = 0;

    // משתנה לשמירת הכרטיס האחרון שהוצג
    let lastVisibleCard = null;

    // לולאה שעוברת על כל הכרטיסיות
    for (let i = 0; i < cards.length; i++) {

        // מסירים סימון קודם (אם היה)
        cards[i].classList.remove("single-result");

        // לוקחים את שם יחידת התוכן (כותרת הכרטיס)
        let titleText = cards[i].getElementsByClassName("card-title")[0].innerText;

        // העמודה שמכילה את הכרטיס (Bootstrap col)
        let col = cards[i].parentElement;

        // אם שדה החיפוש ריק – מציגים את כל היחידות
        if (term === "") {
            col.classList.remove("hidden"); // מציג
            visibleCount++;
            lastVisibleCard = cards[i];
        }
        // אם הטקסט שהוזן נמצא בשם היחידה
        else if (titleText.indexOf(term) !== -1) {
            col.classList.remove("hidden"); // מציג
            visibleCount++;
            lastVisibleCard = cards[i];
        }
        // אחרת – מסתירים את היחידה
        else {
            col.classList.add("hidden");    // מסתיר
        }
    }

    // שכלול: אם נשארה יחידה אחת בלבד – מדגישים אותה
    if (visibleCount === 1 && lastVisibleCard !== null) {
        lastVisibleCard.classList.add("single-result");
    }
}

// ===== שליפת נתוני לומד מה-LMS =====
function fetchLearnerData() {
    // בדיקה שהחיבור ל-SCORM פעיל
    if (isScormConnected) {
        // שליפת נתונים מה-LMS
        const learnerName = pipwerks.SCORM.get('cmi.core.student_name') || '';
        const learnerId = pipwerks.SCORM.get('cmi.core.student_id') || '';
        const status = pipwerks.SCORM.get('cmi.core.lesson_status') || '';
        const score = pipwerks.SCORM.get('cmi.core.score.raw') || '';

        // הדפסת הנתונים לקונסול
        console.log('--- SCORM Learner Data ---');
        console.log('Name = ' + learnerName);
        console.log('ID = ' + learnerId);
        console.log('Status = ' + status);
        console.log('Score = ' + score);
        console.log('---------------------------');

        // הזרקת שם הלומד לעמוד
        const nameEl = document.getElementById('learner-name');
        if (nameEl && learnerName) {
            nameEl.textContent = learnerName;
        }
    }
}

/* =========================================
   שליחת אינטראקציות ל-LMS בצורה מרוכזת
========================================= */
// שליחת כל האינטראקציות בבת אחת (commit יחיד)
function sendInteractionsBatchToLMS(interactions) {
    // בדיקת תקינות הקלט
    if (!Array.isArray(interactions) || interactions.length === 0) return;
    
    // בדיקה שהחיבור ל-SCORM פעיל
    if (isScormConnected) {

        const scorm = pipwerks.SCORM;
        
        // שליפת מספר האינטראקציות הקיים
        let i = parseInt(scorm.get('cmi.interactions._count') || '0', 10);
        if (!Number.isFinite(i)) i = 0;

        // מעבר על כל אינטראקציה ושליחתה ל-LMS
        interactions.forEach((it) => {
            const base = `cmi.interactions.${i}`;
            scorm.set(`${base}.id`, it.id);
            scorm.set(`${base}.type`, it.type);
            scorm.set(`${base}.student_response`, it.student_response);
            scorm.set(`${base}.result`, it.result);
            scorm.set(`${base}.correct_responses.0.pattern`, it.correct_responses);
            i += 1;
        });

        // שמירת כל השינויים ב-LMS
        scorm.save();
    }
}



/* =========================================
   טיפול בשאלון המשוב – אימות ושליחה
========================================= */

// משתנה גלובלי לטופס השאלון
let form;

// אתחול מאזיני הטופס
document.addEventListener('DOMContentLoaded', () => {
    form = document.getElementById('survey-form');
    if (!form) return;

    // מאזין לשליחת הטופס
    form.addEventListener('submit', handleSurveySubmit);
    
    // מאזין לאיפוס הטופס
    form.addEventListener('reset', handleSurveyReset);
});


// ===== טיפול בשליחת השאלון =====
function handleSurveySubmit(e) {
    // מניעת שליחת הטופס הרגילה
    e.preventDefault();

    // הסתרת הודעות שגיאה קודמות
    hideFormErrorMessage();

    // בדיקה שכל שדות החובה מולאו
    if (!allRequiredAnswered()) {
        showFormErrorMessage();
        return;
    }

    // איסוף תשובות השאלון
    const q1 = document.getElementById('q1').value.trim();
    const q2 = form.querySelector('input[name="q2"]:checked').value;
    const q3Selected = Array.from(
        form.querySelectorAll('input[name="q3"]:checked')
    ).map(cb => cb.nextSibling.textContent.trim());

    // הכנת אינטראקציות ל-LMS
    const interactions = [
        {
            id: 'q1_open',
            type: 'fill-in',
            student_response: q1,
            result: 'neutral',
            correct_responses: ''
        },
        {
            id: 'q2_stage',
            type: 'choice',
            student_response: q2,
            result: 'neutral',
            correct_responses: ''
        },
        {
            id: 'q3_topics',
            type: 'choice',
            student_response: q3Selected.join(', '),
            result: 'neutral',
            correct_responses: ''
        }
    ];

    // שליחה ל-LMS עם טיפול בשגיאה כללית
    try {
        sendInteractionsBatchToLMS(interactions);

        // הצגת הודעת הצלחה
        showModal('תודה רבה, הטופס נשלח בהצלחה. ניתן כעת לסגור את העמוד');
    } catch (error) {
        console.error('LMS submission error:', error);

        // הצגת הודעת שגיאה
        showModal('אירעה שגיאה בשליחת הטופס. אנא נסו שוב.');
        return;
    }
}

// ===== טיפול באיפוס השאלון =====
function handleSurveyReset() {
    hideErrors();
    hideFormErrorMessage();
}

/* =========================================
   פונקציות אימות (Validation)
========================================= */
// בדיקה שכל השדות החובה מולאו כראוי
function allRequiredAnswered() {

    let valid = true;

    // ===== שאלה 1 – טקסט פתוח (מינימום 10 תווים) =====
    const q1Input = document.getElementById('q1');
    const q1Error = document.getElementById('q1-error');

    if (q1Input.value.trim().length < 10) {
        q1Error.style.display = 'block';
        valid = false;
    } else {
        q1Error.style.display = 'none';
    }

    // ===== שאלה 2 – חד-ברירה (בחירה אחת חובה) =====
    const q2Checked = form.querySelector('input[name="q2"]:checked');
    const q2Error = document.getElementById('q2-error');

    if (!q2Checked) {
        q2Error.style.display = 'block';
        valid = false;
    } else {
        q2Error.style.display = 'none';
    }

    // ===== שאלה 3 – רב-ברירה (לפחות בחירה אחת) =====
    const q3Checked = form.querySelectorAll('input[name="q3"]:checked');
    const q3Error = document.getElementById('q3-error');

    if (q3Checked.length === 0) {
        q3Error.style.display = 'block';
        valid = false;
    } else {
        q3Error.style.display = 'none';
    }

    return valid;
}


/* =========================================
   פונקציות עזר לממשק המשתמש (UI helpers)
========================================= */

// הסתרת כל הודעות השגיאה בטופס
function hideErrors() {
    const errors = document.querySelectorAll('.error-text');
    errors.forEach(err => err.style.display = 'none');
}

// הצגת הודעת שגיאה כללית מעל הטופס
function showFormErrorMessage() {
    const msg = document.getElementById('form-error-message');
    if (msg) msg.style.display = 'block';
}

// הסתרת הודעת שגיאה כללית
function hideFormErrorMessage() {
    const msg = document.getElementById('form-error-message');
    if (msg) msg.style.display = 'none';
}

// הצגת חלון מודאלי עם הודעה
function showModal(message) {
    const modal = document.getElementById('surveyModal');
    const modalMessage = document.getElementById('modal-message');

    if (modal && modalMessage) {
        modalMessage.textContent = message;
        modal.classList.add('show');
    }
}

// סגירת חלון המודאלי
function closeModal() {
    const modal = document.getElementById('surveyModal');
    if (modal) {
        modal.classList.remove('show');
    }
}

// ===== ניקוי וסגירת חיבור SCORM =====
// מאזין לסגירת/עזיבת העמוד
window.addEventListener('beforeunload', saveAndCloseSession);

// שמירה וסגירת החיבור ל-LMS
function saveAndCloseSession() {
    pipwerks.SCORM.save();
    pipwerks.SCORM.quit();
}