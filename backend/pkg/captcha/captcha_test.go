package captcha

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestGenerateAndValidate(t *testing.T) {
	svc := NewCaptchaService(CaptchaOptions{
		Length: 4,
		TTL:    time.Minute,
	})

	captcha, err := svc.Generate()
	require.NoError(t, err)
	require.NotNil(t, captcha)
	assert.Len(t, captcha.Solution, 4)
	assert.NotEmpty(t, captcha.ImageData)

	valid := svc.Validate(captcha.ID, captcha.Solution)
	assert.True(t, valid)

	// One-time use; second attempt should fail
	assert.False(t, svc.Validate(captcha.ID, captcha.Solution))
}

func TestCaptchaExpiration(t *testing.T) {
	svc := NewCaptchaService(CaptchaOptions{
		Length: 4,
		TTL:    time.Millisecond * 50,
	})

	captcha, err := svc.Generate()
	require.NoError(t, err)

	time.Sleep(75 * time.Millisecond)

	valid := svc.Validate(captcha.ID, captcha.Solution)
	assert.False(t, valid)
}
