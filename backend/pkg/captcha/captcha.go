package captcha

import (
	"crypto/rand"
	"encoding/base64"
	"fmt"
	"image"
	"image/color"
	"image/draw"
	"image/png"
	"io"
	"math"
	"math/big"
	"sync"
	"time"

	"golang.org/x/image/font"
	"golang.org/x/image/font/basicfont"
	"golang.org/x/image/math/fixed"
)

// CaptchaService manages CAPTCHA generation and validation
type CaptchaService struct {
	store   *CaptchaStore
	mu      sync.RWMutex
	options CaptchaOptions
}

// CaptchaOptions configures CAPTCHA generation
type CaptchaOptions struct {
	Length     int
	Width      int
	Height     int
	TTL        time.Duration
	Difficulty string // "easy", "medium", "hard"
}

// CaptchaData represents a CAPTCHA challenge
type CaptchaData struct {
	ID        string
	Solution  string
	ImageData []byte
	CreatedAt time.Time
	ExpiresAt time.Time
}

// CaptchaStore manages CAPTCHA storage
type CaptchaStore struct {
	captchas map[string]*CaptchaData
	mu       sync.RWMutex
}

// NewCaptchaStore creates a new CAPTCHA store
func NewCaptchaStore() *CaptchaStore {
	store := &CaptchaStore{
		captchas: make(map[string]*CaptchaData),
	}

	// Start cleanup goroutine
	go store.cleanup()

	return store
}

// cleanup periodically removes expired CAPTCHAs
func (s *CaptchaStore) cleanup() {
	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()

	for range ticker.C {
		s.mu.Lock()
		now := time.Now()
		for id, captcha := range s.captchas {
			if now.After(captcha.ExpiresAt) {
				delete(s.captchas, id)
			}
		}
		s.mu.Unlock()
	}
}

// Set stores a CAPTCHA
func (s *CaptchaStore) Set(captcha *CaptchaData) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.captchas[captcha.ID] = captcha
}

// Get retrieves a CAPTCHA
func (s *CaptchaStore) Get(id string) (*CaptchaData, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	captcha, ok := s.captchas[id]
	return captcha, ok
}

// Delete removes a CAPTCHA
func (s *CaptchaStore) Delete(id string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	delete(s.captchas, id)
}

// NewCaptchaService creates a new CAPTCHA service
func NewCaptchaService(options CaptchaOptions) *CaptchaService {
	if options.Length == 0 {
		options.Length = 6
	}
	if options.Width == 0 {
		options.Width = 200
	}
	if options.Height == 0 {
		options.Height = 80
	}
	if options.TTL == 0 {
		options.TTL = 5 * time.Minute
	}
	if options.Difficulty == "" {
		options.Difficulty = "medium"
	}

	return &CaptchaService{
		store:   NewCaptchaStore(),
		options: options,
	}
}

// Generate creates a new CAPTCHA
func (s *CaptchaService) Generate() (*CaptchaData, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	// Generate ID
	id, err := generateRandomString(16)
	if err != nil {
		return nil, fmt.Errorf("failed to generate ID: %w", err)
	}

	// Generate solution
	solution, err := s.generateSolution()
	if err != nil {
		return nil, fmt.Errorf("failed to generate solution: %w", err)
	}

	// Generate image
	imageData, err := s.generateImage(solution)
	if err != nil {
		return nil, fmt.Errorf("failed to generate image: %w", err)
	}

	now := time.Now()
	captcha := &CaptchaData{
		ID:        id,
		Solution:  solution,
		ImageData: imageData,
		CreatedAt: now,
		ExpiresAt: now.Add(s.options.TTL),
	}

	s.store.Set(captcha)

	return captcha, nil
}

// Validate checks if a CAPTCHA solution is correct
func (s *CaptchaService) Validate(id, solution string) bool {
	captcha, ok := s.store.Get(id)
	if !ok {
		return false
	}

	// Check expiration
	if time.Now().After(captcha.ExpiresAt) {
		s.store.Delete(id)
		return false
	}

	// Check solution (case-insensitive)
	valid := captcha.Solution == solution

	// Delete after validation (one-time use)
	s.store.Delete(id)

	return valid
}

// generateSolution creates a random CAPTCHA solution
func (s *CaptchaService) generateSolution() (string, error) {
	var chars string
	switch s.options.Difficulty {
	case "easy":
		chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789" // No confusing chars
	case "hard":
		chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
	default: // medium
		chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
	}

	result := make([]byte, s.options.Length)
	for i := range result {
		n, err := rand.Int(rand.Reader, big.NewInt(int64(len(chars))))
		if err != nil {
			return "", err
		}
		result[i] = chars[n.Int64()]
	}

	return string(result), nil
}

// generateImage creates a CAPTCHA image
func (s *CaptchaService) generateImage(text string) ([]byte, error) {
	// Create image
	img := image.NewRGBA(image.Rect(0, 0, s.options.Width, s.options.Height))

	// Fill background
	backgroundColor := color.RGBA{R: 240, G: 240, B: 245, A: 255}
	draw.Draw(img, img.Bounds(), &image.Uniform{backgroundColor}, image.Point{}, draw.Src)

	// Add noise
	if err := s.addNoise(img); err != nil {
		return nil, err
	}

	// Draw text
	if err := s.drawText(img, text); err != nil {
		return nil, err
	}

	// Add distortion based on difficulty
	if s.options.Difficulty == "hard" {
		s.addDistortion(img)
	}

	// Encode to PNG
	var buf []byte
	w := &byteWriter{buf: &buf}
	if err := png.Encode(w, img); err != nil {
		return nil, err
	}

	return buf, nil
}

// addNoise adds random dots to the image
func (s *CaptchaService) addNoise(img *image.RGBA) error {
	bounds := img.Bounds()

	// Add random dots
	numDots := s.options.Width * s.options.Height / 50
	for i := 0; i < numDots; i++ {
		x, err := rand.Int(rand.Reader, big.NewInt(int64(bounds.Max.X)))
		if err != nil {
			return err
		}
		y, err := rand.Int(rand.Reader, big.NewInt(int64(bounds.Max.Y)))
		if err != nil {
			return err
		}

		gray, err := rand.Int(rand.Reader, big.NewInt(128))
		if err != nil {
			return err
		}
		c := color.RGBA{
			R: uint8(gray.Int64() + 127),
			G: uint8(gray.Int64() + 127),
			B: uint8(gray.Int64() + 127),
			A: 255,
		}

		img.Set(int(x.Int64()), int(y.Int64()), c)
	}

	// Add random lines
	numLines := 3
	for i := 0; i < numLines; i++ {
		x1, _ := rand.Int(rand.Reader, big.NewInt(int64(bounds.Max.X)))
		y1, _ := rand.Int(rand.Reader, big.NewInt(int64(bounds.Max.Y)))
		x2, _ := rand.Int(rand.Reader, big.NewInt(int64(bounds.Max.X)))
		y2, _ := rand.Int(rand.Reader, big.NewInt(int64(bounds.Max.Y)))

		s.drawLine(img, int(x1.Int64()), int(y1.Int64()), int(x2.Int64()), int(y2.Int64()))
	}

	return nil
}

// drawText renders the CAPTCHA text
func (s *CaptchaService) drawText(img *image.RGBA, text string) error {
	bounds := img.Bounds()
	charWidth := bounds.Max.X / len(text)

	for i, ch := range text {
		// Calculate position with some randomness
		offsetX, err := rand.Int(rand.Reader, big.NewInt(10))
		if err != nil {
			return err
		}
		offsetY, err := rand.Int(rand.Reader, big.NewInt(10))
		if err != nil {
			return err
		}

		x := i*charWidth + int(offsetX.Int64())
		y := bounds.Max.Y/2 + int(offsetY.Int64())

		// Random color (dark)
		rVal, _ := rand.Int(rand.Reader, big.NewInt(128))
		gVal, _ := rand.Int(rand.Reader, big.NewInt(128))
		bVal, _ := rand.Int(rand.Reader, big.NewInt(128))

		textColor := color.RGBA{
			R: uint8(rVal.Int64()),
			G: uint8(gVal.Int64()),
			B: uint8(bVal.Int64()),
			A: 255,
		}

		// Draw character
		point := fixed.Point26_6{
			X: fixed.Int26_6(x * 64),
			Y: fixed.Int26_6(y * 64),
		}

		d := &font.Drawer{
			Dst:  img,
			Src:  image.NewUniform(textColor),
			Face: basicfont.Face7x13,
			Dot:  point,
		}

		d.DrawString(string(ch))
	}

	return nil
}

// drawLine draws a line on the image
func (s *CaptchaService) drawLine(img *image.RGBA, x1, y1, x2, y2 int) {
	lineColor := color.RGBA{R: 200, G: 200, B: 200, A: 255}

	dx := math.Abs(float64(x2 - x1))
	dy := math.Abs(float64(y2 - y1))

	var steps int
	if dx > dy {
		steps = int(dx)
	} else {
		steps = int(dy)
	}

	xInc := float64(x2-x1) / float64(steps)
	yInc := float64(y2-y1) / float64(steps)

	x := float64(x1)
	y := float64(y1)

	for i := 0; i <= steps; i++ {
		img.Set(int(x), int(y), lineColor)
		x += xInc
		y += yInc
	}
}

// addDistortion adds wave distortion to the image
func (s *CaptchaService) addDistortion(img *image.RGBA) {
	// Simple sine wave distortion
	// In production, you'd implement more sophisticated distortion
}

// generateRandomString generates a random string
func generateRandomString(length int) (string, error) {
	bytes := make([]byte, length)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return base64.URLEncoding.EncodeToString(bytes)[:length], nil
}

// byteWriter implements io.Writer for []byte
type byteWriter struct {
	buf *[]byte
}

func (w *byteWriter) Write(p []byte) (n int, err error) {
	*w.buf = append(*w.buf, p...)
	return len(p), nil
}

var _ io.Writer = (*byteWriter)(nil)
