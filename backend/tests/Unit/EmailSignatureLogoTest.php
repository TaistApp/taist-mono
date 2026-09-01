<?php

namespace Tests\Unit;

use App\Console\Commands\SendChefApplicantFollowup;
use App\Http\Controllers\MapiController;
use ReflectionClass;
use Tests\TestCase;

/**
 * Guards the sizing of the logo block in Taist's outgoing email signatures.
 *
 * The asset is 300x150. Four transactional emails embedded it with no width or
 * height, so it rendered at full intrinsic size, roughly 2.5x larger than
 * intended and inconsistent between templates. Outlook ignores CSS-only sizing,
 * so the HTML width/height attributes are what actually constrain it there and
 * must not be dropped.
 */
class EmailSignatureLogoTest extends TestCase
{
    private function invokePrivate($object, string $method, array $args = [])
    {
        $ref = (new ReflectionClass($object))->getMethod($method);
        $ref->setAccessible(true);

        return $ref->invokeArgs($object, $args);
    }

    private function controllerLogoHtml(): string
    {
        $controller = (new ReflectionClass(MapiController::class))->newInstanceWithoutConstructor();

        return $this->invokePrivate($controller, '_logoHtml');
    }

    public function testTransactionalLogoCarriesHtmlSizingAttributes(): void
    {
        $html = $this->controllerLogoHtml();

        $this->assertStringContainsString("width='120'", $html);
        $this->assertStringContainsString("height='60'", $html);
        $this->assertStringContainsString('width:120px;height:60px;', $html);
    }

    public function testTransactionalLogoUsesTheTransparentAsset(): void
    {
        $this->assertStringContainsString(
            '/assets/images/logo-2.png',
            $this->controllerLogoHtml(),
            'logo-2.png is the transparent (RGBA) wordmark; logo.png has no alpha channel.'
        );
    }

    public function testApplicantFollowupLogoMatchesTransactionalSizing(): void
    {
        $command = (new ReflectionClass(SendChefApplicantFollowup::class))->newInstanceWithoutConstructor();
        $html = $this->invokePrivate($command, 'buildHtml', ['Jarred']);

        $this->assertStringContainsString('width="120"', $html);
        $this->assertStringContainsString('height="60"', $html);
        $this->assertStringContainsString('/assets/images/logo-2.png', $html);
    }

    /**
     * An artisan run has no request context, so an unset APP_URL would resolve to
     * localhost and produce an image no recipient can load.
     */
    public function testApplicantFollowupLogoNeverPointsAtLocalhost(): void
    {
        $command = (new ReflectionClass(SendChefApplicantFollowup::class))->newInstanceWithoutConstructor();

        config(['app.url' => 'http://localhost']);
        $this->assertStringNotContainsString('localhost', $this->invokePrivate($command, 'logoUrl'));

        config(['app.url' => '']);
        $this->assertStringNotContainsString('localhost', $this->invokePrivate($command, 'logoUrl'));
    }

    /** Control: a configured production host is used as-is rather than overridden. */
    public function testApplicantFollowupLogoHonoursConfiguredHost(): void
    {
        $command = (new ReflectionClass(SendChefApplicantFollowup::class))->newInstanceWithoutConstructor();

        config(['app.url' => 'https://api.taist.app']);

        $this->assertSame(
            'https://api.taist.app/assets/images/logo-2.png',
            $this->invokePrivate($command, 'logoUrl')
        );
    }
}
