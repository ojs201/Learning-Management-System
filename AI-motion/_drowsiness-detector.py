import numpy as np
import dlib
import cv2
import time

RIGHT_EYE = list(range(36, 42))
LEFT_EYE = list(range(42, 48))
EYES = list(range(36, 48))

frame_width = 640
frame_height = 480

title_name = 'Drowsiness_Detection'

face_cascade_name = './haarcascade_frontalface_alt.xml'
face_cascade = cv2.CascadeClassifier()
if not face_cascade.load(cv2.samples.findFile(face_cascade_name)):
    print('--(!)Error loading face cascade')
    exit(0)

predictor_file = './shape_predictor_68_face_landmarks.dat'
predictor = dlib.shape_predictor(predictor_file)

status = 'Awake'
number_closed = 0
min_EAR = 0.275
closed_limit = 15  # -- 눈 감김이 15번 이상일 경우 졸음으로 간주
show_frame = None
sign = None
color = None


# EAR: Eye Aspect Ratio 눈의 비율을 이용해 눈 감김 체크
def getEAR(points):
    A = np.linalg.norm(points[1] - points[5])
    B = np.linalg.norm(points[2] - points[4])
    C = np.linalg.norm(points[0] - points[3])
    return (A + B) / (2.0 * C)


def detectAndDisplay(image):
    global status
    global number_closed
    global color
    global show_frame
    global sign

    image = cv2.resize(image, (frame_width, frame_height))
    # show_frame = cv2.flip(image, 1)
    show_frame = image
    frame_gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    frame_gray = cv2.equalizeHist(frame_gray)
    # equalizeHist: 영상의 픽셀값들의 누적분포함수를 이용하여 영상을 개선하는 방법
    faces = face_cascade.detectMultiScale(frame_gray)

    for (x, y, w, h) in faces:
        cv2.rectangle(image, (x, y), (x + w, y + h), (0, 255, 0), 2)

        # openCV이미지를 dlib용 사각형으로 변환
        rect = dlib.rectangle(int(x), int(y), int(x + w), int(y + h))
        # 랜드마크 포인트 지정
        points = np.matrix([[p.x, p.y] for p in predictor(image, rect).parts()])
        # 원하는 포인트(눈)
        show_points = points[EYES]

        right_eye_EAR = getEAR(points[RIGHT_EYE])
        left_eye_EAR = getEAR(points[LEFT_EYE])
        mean_eye_EAR = (right_eye_EAR + left_eye_EAR) / 2

        right_eye_center = np.mean(points[RIGHT_EYE], axis=0).astype("int")
        left_eye_center = np.mean(points[LEFT_EYE], axis=0).astype("int")

        cv2.putText(image, "{:.2f}".format(right_eye_EAR), (right_eye_center[0, 0], right_eye_center[0, 1] + 20),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 1)
        cv2.putText(image, "{:.2f}".format(left_eye_EAR), (left_eye_center[0, 0], left_eye_center[0, 1] + 20),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 1)

        for (i, point) in enumerate(show_points):
            x = point[0, 0]
            y = point[0, 1]
            cv2.circle(image, (x, y), 1, (0, 255, 255), -1)

        if mean_eye_EAR > min_EAR:  # 눈 뜸
            color = (0, 255, 0)
            status = 'Awake'
            # number_closed = number_closed - 1
            number_closed = 0
            if (number_closed < 0):
                number_closed = 0
        else:  # 눈 감음
            color = (0, 0, 255)
            # status = 'sleep'
            number_closed = number_closed + 1

        if number_closed > closed_limit:
            color = (0, 0, 255)
            status = 'sleep'

        sign = 'sleep count : ' + str(number_closed) + ' / ' + str(closed_limit)

    cv2.putText(show_frame, status, (frame_width // 2 - 100, frame_height - 430), cv2.FONT_HERSHEY_DUPLEX, 2, color, 2)
    cv2.putText(show_frame, sign, (10, frame_height - 20), cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)
    cv2.imshow(title_name, show_frame)


cap = cv2.VideoCapture(0)
time.sleep(2.0)
if not cap.isOpened:
    print('Could not open video')
    exit(0)

while True:
    ret, frame = cap.read()

    if frame is None:
        print('Could not read frame')
        cap.release()
        break

    detectAndDisplay(frame)

    # q 입력시 종료
    if cv2.waitKey(1) == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()