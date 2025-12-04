<?php
 
namespace App\Http\Controllers\Admin;
 
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Session;
use Illuminate\Support\Str;
use App\Models\Admins;
 
class LoginController extends Controller
{
    /**
     * Handle an authentication attempt.
     *
     * @param  \Illuminate\Http\Request $request
     *
     * @return Response
     */
    protected function validator(array $data)
    {
        return Validator::make($data, [
            'email' => ['required', 'string', 'email', 'max:255', 'unique:tbl_admins'],
            'password' => ['required', 'string', 'min:4', 'confirmed'],
        ]);
    }

    public function viewLogin(Request $request)
    {
        return view("admin.login");
    }

    public function login(Request $request)
    {
        $credentials = $request->only('email', 'password');        
        $user = app(Admins::class)->where('email', $request->email)->first();
        
        if (!$user) {
            return back()->withErrors([
                'message' => 'The email or password is incorrect, please try again.'
            ]);
        }
        
        if ($this->guard()->attempt($credentials)) {
            if ($user->active != 1) {
                $this->guard()->logout();
                return back()->withErrors([
                    'message' => 'Your account was not activated.'
                ]);
            }
            $this->setToken();
            return redirect()->intended('/admin/chefs');
        } else {
            return back()->withErrors([
                'message' => 'The email or password is incorrect, please try again.'
            ]);
        }
    }

    private function setToken() {
        $user = $this->guard()->user();
        app(Admins::class)->where('id', $user->id)->update(['api_token' => uniqid().Str::random(60)]);
    }

    protected function guard() {
        return Auth::guard('admin');
    }

    public function logout(Request $request)
    {
        $this->guard()->logout();
        return redirect()->to('/admin');
    }
}