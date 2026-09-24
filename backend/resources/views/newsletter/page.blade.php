<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<meta name="robots" content="noindex">
<title>{{ $title }} · Taist</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap');
  body { margin: 0; background: #fafafa; font-family: 'Poppins', Arial, sans-serif; color: #1a1a1a; }
  .wrap { max-width: 480px; margin: 0 auto; padding: 48px 16px; text-align: center; }
  .card { background: #fff; border: 1px solid #ebebeb; border-radius: 16px; padding: 36px 28px; }
  .bar { height: 4px; background: #fa4616; border-radius: 16px 16px 0 0; margin: -36px -28px 28px; }
  h1 { font-size: 22px; margin: 0 0 12px; color: #0a0a0a; }
  p { font-size: 15px; line-height: 1.6; margin: 0 0 16px; color: #3a3a3a; }
  button { font-family: inherit; font-size: 15px; font-weight: 600; padding: 12px 28px; border-radius: 50px; cursor: pointer; }
  .primary { background: #fa4616; color: #fff; border: 2px solid #fa4616; }
  .secondary { background: #fff; color: #fa4616; border: 2px solid #fa4616; }
  .muted { font-size: 13px; color: #8a8580; margin-top: 20px; }
  img { width: 120px; margin-bottom: 24px; }
</style>
</head>
<body>
<div class="wrap">
  <a href="https://taist.app"><img src="https://taist.app/images/taist-logo-only-cropped.png" alt="taist"></a>
  <div class="card">
    <div class="bar"></div>
    <h1>{{ $title }}</h1>
    @foreach ((array) $message as $line)
      <p>{{ $line }}</p>
    @endforeach
    @if (!empty($form))
      <form method="POST" action="{{ $form['action'] }}">
        <button type="submit" class="{{ $form['style'] ?? 'primary' }}">{{ $form['button'] }}</button>
      </form>
    @endif
  </div>
  @if (!empty($footnote))
    <p class="muted">{{ $footnote }}</p>
  @endif
</div>
</body>
</html>
