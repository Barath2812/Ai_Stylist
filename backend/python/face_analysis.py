import sys
import os
import cv2
import mediapipe as mp
import numpy as np
import json

print("Mediapipe path:", mp.__file__)
# Initialize MediaPipe Face Mesh
mp_face_mesh = mp.solutions.face_mesh
face_mesh = mp_face_mesh.FaceMesh(
    static_image_mode=True,
    max_num_faces=2,
    refine_landmarks=True,
    min_detection_confidence=0.5
)

def get_face_shape(landmarks, image_shape):
    """Enhanced face shape detection with confidence score"""
    h, w, _ = image_shape
    
    # Key landmarks for face shape
    coords = {}
    for idx, lm in enumerate(landmarks.landmark):
        coords[idx] = (int(lm.x * w), int(lm.y * h))

    # Calculate widths and lengths
    jaw_width = np.linalg.norm(np.array(coords[234]) - np.array(coords[454]))
    forehead_width = np.linalg.norm(np.array(coords[103]) - np.array(coords[332]))
    face_length = np.linalg.norm(np.array(coords[10]) - np.array(coords[152]))
    cheekbone_width = np.linalg.norm(np.array(coords[205]) - np.array(coords[425]))
    
    # Ratios
    ratio_len_wide = face_length / jaw_width if jaw_width > 0 else 1.5
    ratio_forehead_jaw = forehead_width / jaw_width if jaw_width > 0 else 1.0
    ratio_cheek_jaw = cheekbone_width / jaw_width if jaw_width > 0 else 1.0
    
    # Enhanced classification with confidence
    confidence = 0.0
    
    if ratio_len_wide > 1.5:
        shape = "Oblong"
        confidence = min(0.95, 0.65 + (ratio_len_wide - 1.5) * 0.2)
    elif ratio_len_wide < 1.15:
        shape = "Square"
        confidence = min(0.95, 0.65 + (1.15 - ratio_len_wide) * 0.3)
    elif ratio_forehead_jaw < 0.85:
        shape = "Round"
        confidence = min(0.95, 0.65 + (0.85 - ratio_forehead_jaw) * 0.4)
    elif ratio_forehead_jaw > 1.15:
        shape = "Heart"
        confidence = min(0.95, 0.65 + (ratio_forehead_jaw - 1.15) * 0.3)
    else:
        shape = "Oval"
        confidence = 0.85  # Oval is balanced, high confidence
    
    return {
        "type": shape,
        "confidence": round(confidence, 2),
        "measurements": {
            "faceLength": round(face_length, 2),
            "jawWidth": round(jaw_width, 2),
            "foreheadWidth": round(forehead_width, 2),
            "cheekboneWidth": round(cheekbone_width, 2),
            "lengthToWidthRatio": round(ratio_len_wide, 2)
        }
    }

def get_skin_tone(image, landmarks):
    """Enhanced skin tone analysis with undertone and RGB/Hex values"""
    h, w, _ = image.shape
    
    # Use multiple face regions for better accuracy
    regions = [
        50,   # cheek
        280,  # forehead
        152,  # nose bridge
    ]
    
    skin_samples = []
    
    for lm_idx in regions:
        try:
            lm_x = int(landmarks.landmark[lm_idx].x * w)
            lm_y = int(landmarks.landmark[lm_idx].y * h)
            
            # Ensure bounds
            if 10 < lm_x < w-30 and 10 < lm_y < h-30:
                patch = image[lm_y:lm_y+20, lm_x:lm_x+20]
                
                if patch.size > 0:
                    avg_bgr = np.mean(patch, axis=(0,1))
                    skin_samples.append(avg_bgr)
        except:
            continue
    
    if len(skin_samples) == 0:
        return {
            "category": "Medium",
            "undertone": "Neutral",
            "hex": "#C68642",
            "rgb": [198, 134, 66]
        }
    
    # Average all samples
    avg_skin = np.mean(skin_samples, axis=0)
    b, g, r = avg_skin
    
    # Convert to HSV for brightness
    hsv_color = cv2.cvtColor(np.uint8([[avg_skin]]), cv2.COLOR_BGR2HSV)[0][0]
    brightness = hsv_color[2]
    
    # Determine skin tone category
    if brightness > 170:
        category = "Fair"
    elif brightness < 100:
        category = "Dark"
    else:
        category = "Medium"
    
    # Determine undertone (warm/cool/neutral)
    # Warm: More red/yellow, Cool: More blue/pink, Neutral: Balanced
    red_green_diff = r - g
    red_blue_diff = r - b
    
    if red_green_diff > 10 and red_blue_diff > 15:
        undertone = "Warm"
    elif b > r and b > g:
        undertone = "Cool"
    else:
        undertone = "Neutral"
    
    # Create hex color
    hex_color = "#{:02x}{:02x}{:02x}".format(int(r), int(g), int(b))
    
    return {
        "category": category,
        "undertone": undertone,
        "hex": hex_color,
        "rgb": [int(r), int(g), int(b)]
    }

def check_image_quality(image):
    """Check image quality for proper analysis"""
    h, w, _ = image.shape
    
    # Convert to grayscale for analysis
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    
    # Check image size
    if w < 300 or h < 300:
        return {
            "valid": False,
            "lighting": "unknown",
            "clarity": "low",
            "issue": "Image too small"
        }
    
    # Check brightness (lighting)
    avg_brightness = np.mean(gray)
    if avg_brightness < 50:
        lighting = "too_dark"
    elif avg_brightness > 200:
        lighting = "too_bright"
    else:
        lighting = "good"
    
    # Check blur/clarity using Laplacian variance
    laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
    
    if laplacian_var < 100:
        clarity = "low"
    elif laplacian_var < 500:
        clarity = "medium"
    else:
        clarity = "high"
    
    return {
        "valid": True,
        "lighting": lighting,
        "clarity": clarity,
        "brightness": round(avg_brightness, 2),
        "sharpness": round(laplacian_var, 2)
    }

def calculate_facial_symmetry(landmarks, image_shape):
    """Calculate facial symmetry score"""
    h, w, _ = image_shape
    
    # Key symmetric landmark pairs
    pairs = [
        (234, 454),  # Jaw corners
        (33, 263),   # Eye corners
        (103, 332),  # Eyebrow peaks
    ]
    
    asymmetry_scores = []
    
    for left_idx, right_idx in pairs:
        left = landmarks.landmark[left_idx]
        right = landmarks.landmark[right_idx]
        
        left_pos = np.array([left.x * w, left.y * h])
        right_pos = np.array([right.x * w, right.y * h])
        
        # Calculate center line distance
        center_x = w / 2
        left_dist = abs(left_pos[0] - center_x)
        right_dist = abs(right_pos[0] - center_x)
        
        # Asymmetry = difference in distances from center
        asymmetry = abs(left_dist - right_dist) / w
        asymmetry_scores.append(asymmetry)
    
    # Average asymmetry, convert to symmetry score (0-1)
    avg_asymmetry = np.mean(asymmetry_scores)
    symmetry = max(0, 1 - (avg_asymmetry * 10))
    
    return round(symmetry, 2)

def main():
    if len(sys.argv) < 3:
        print(json.dumps({"error": "Missing arguments"}))
        return

    image_path = sys.argv[1]
    occasion = sys.argv[2]

    try:
        # Load image and resize if too large (>8MB)
        image = cv2.imread(image_path)
        if image is None:
            print(json.dumps({"error": "Could not read image"}))
            return

        # Check file size and resize if needed (prevent memory issues)
        file_size_mb = os.path.getsize(image_path) / (1024 * 1024)
        if file_size_mb > 8:
            print(f"Image >8MB ({file_size_mb:.1f}MB), resizing...", file=sys.stderr)
            height, width = image.shape[:2]
            if width > height:
                new_width = 1920
                new_height = int(height * (new_width / width))
            else:
                new_height = 1920
                new_width = int(width * (new_height / height))
            image = cv2.resize(image, (new_width, new_height), interpolation=cv2.INTER_LANCZOS4)
            print(f"Resized to {new_width}x{new_height}", file=sys.stderr)

        # Check image quality first
        quality_check = check_image_quality(image)
        
        # Process face
        results = face_mesh.process(cv2.cvtColor(image, cv2.COLOR_BGR2RGB))
        
        if not results.multi_face_landmarks:
             print(json.dumps({"error": "No face detected"}))
             return
        
        if len(results.multi_face_landmarks) > 1:
             print(json.dumps({"error": "Multiple faces detected. Please upload a solo photo."}))
             return

        landmarks = results.multi_face_landmarks[0]
        
        # Get enhanced analysis
        face_shape_data = get_face_shape(landmarks, image.shape)
        skin_tone_data = get_skin_tone(image, landmarks)
        symmetry_score = calculate_facial_symmetry(landmarks, image.shape)
        
        # Enhanced output with all new data
        output = {
            "valid": True,
            "faceDetected": True,
            "imageQuality": quality_check,
            "faceShape": face_shape_data["type"],  # Keep backward compatible
            "faceShapeData": face_shape_data,      # New detailed data
            "skinTone": skin_tone_data["category"],  # Keep backward compatible
            "skinToneData": skin_tone_data,        # New detailed data
            "facialSymmetry": symmetry_score,
            "occasion": occasion
        }
        
        print(json.dumps(output))

    except Exception as e:
        print(json.dumps({"error": str(e)}))

if __name__ == "__main__":
    main()
